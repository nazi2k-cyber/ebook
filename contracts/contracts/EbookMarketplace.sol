// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "./EbookNFT.sol";

/**
 * @title EbookMarketplace
 * @dev NFT 기반 ebook 저작권 거래소
 * - 고정가 판매 (직접 구매)
 * - 경매 (시간 기반)
 * - 로열티 자동 분배
 * - 플랫폼 수수료 자동 정산
 */
contract EbookMarketplace is ReentrancyGuard, Ownable {

    EbookNFT public ebookNFT;

    uint256 public platformFeePercent = 250; // 2.5%
    address public platformWallet;

    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;
        bool isActive;
        uint256 listedAt;
        ListingType listingType;
    }

    struct Auction {
        uint256 tokenId;
        address seller;
        uint256 startPrice;
        uint256 currentBid;
        address highestBidder;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        bool isFinalized;
    }

    enum ListingType { FixedPrice, Auction }

    // listingId => Listing
    mapping(uint256 => Listing) public listings;
    uint256 public listingCount;

    // auctionId => Auction
    mapping(uint256 => Auction) public auctions;
    uint256 public auctionCount;

    // 입찰자 주소 => 환불 가능 금액 (입찰 취소 시)
    mapping(address => uint256) public pendingWithdrawals;

    event Listed(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price,
        ListingType listingType
    );

    event Sold(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address indexed buyer,
        address seller,
        uint256 price,
        uint256 royaltyPaid,
        uint256 platformFee
    );

    event AuctionCreated(
        uint256 indexed auctionId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 startPrice,
        uint256 endTime
    );

    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount
    );

    event AuctionFinalized(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 finalPrice
    );

    event ListingCancelled(uint256 indexed listingId);

    constructor(address _ebookNFT, address _platformWallet)
        Ownable(msg.sender)
    {
        ebookNFT = EbookNFT(_ebookNFT);
        platformWallet = _platformWallet;
    }

    /**
     * @dev NFT를 고정가로 마켓에 등록
     */
    function listForSale(uint256 tokenId, uint256 price) external nonReentrant {
        require(ebookNFT.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(price > 0, "Price must be positive");
        require(
            ebookNFT.isApprovedForAll(msg.sender, address(this)) ||
            ebookNFT.getApproved(tokenId) == address(this),
            "Marketplace not approved"
        );

        listings[listingCount] = Listing({
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            isActive: true,
            listedAt: block.timestamp,
            listingType: ListingType.FixedPrice
        });

        emit Listed(listingCount, tokenId, msg.sender, price, ListingType.FixedPrice);
        listingCount++;
    }

    /**
     * @dev 고정가 NFT 즉시 구매
     */
    function buyNow(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "Listing not active");
        require(listing.listingType == ListingType.FixedPrice, "Not fixed price listing");
        require(msg.value >= listing.price, "Insufficient payment");
        require(msg.sender != listing.seller, "Cannot buy your own NFT");

        listing.isActive = false;

        _processSale(listing.tokenId, listing.seller, msg.sender, listing.price);

        // 초과 지불액 환불
        if (msg.value > listing.price) {
            payable(msg.sender).transfer(msg.value - listing.price);
        }
    }

    /**
     * @dev 경매 생성
     */
    function createAuction(
        uint256 tokenId,
        uint256 startPrice,
        uint256 durationInHours
    ) external nonReentrant {
        require(ebookNFT.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(startPrice > 0, "Start price required");
        require(durationInHours >= 1 && durationInHours <= 720, "Duration: 1-720 hours");
        require(
            ebookNFT.isApprovedForAll(msg.sender, address(this)) ||
            ebookNFT.getApproved(tokenId) == address(this),
            "Marketplace not approved"
        );

        uint256 endTime = block.timestamp + (durationInHours * 1 hours);

        auctions[auctionCount] = Auction({
            tokenId: tokenId,
            seller: msg.sender,
            startPrice: startPrice,
            currentBid: 0,
            highestBidder: address(0),
            startTime: block.timestamp,
            endTime: endTime,
            isActive: true,
            isFinalized: false
        });

        emit AuctionCreated(auctionCount, tokenId, msg.sender, startPrice, endTime);
        auctionCount++;
    }

    /**
     * @dev 경매 입찰
     */
    function placeBid(uint256 auctionId) external payable nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.isActive, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.sender != auction.seller, "Seller cannot bid");

        uint256 minBid = auction.currentBid == 0
            ? auction.startPrice
            : auction.currentBid + (auction.currentBid / 10); // 최소 10% 높게

        require(msg.value >= minBid, "Bid too low");

        // 이전 최고 입찰자에게 환불 예약
        if (auction.highestBidder != address(0)) {
            pendingWithdrawals[auction.highestBidder] += auction.currentBid;
        }

        auction.currentBid = msg.value;
        auction.highestBidder = msg.sender;

        emit BidPlaced(auctionId, msg.sender, msg.value);
    }

    /**
     * @dev 경매 종료 및 정산
     */
    function finalizeAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.isActive, "Auction not active");
        require(block.timestamp >= auction.endTime, "Auction still ongoing");
        require(!auction.isFinalized, "Already finalized");

        auction.isActive = false;
        auction.isFinalized = true;

        if (auction.highestBidder != address(0)) {
            _processSale(
                auction.tokenId,
                auction.seller,
                auction.highestBidder,
                auction.currentBid
            );
            emit AuctionFinalized(auctionId, auction.highestBidder, auction.currentBid);
        } else {
            // 입찰 없이 경매 종료 - NFT 반환 (승인 취소 필요 없음, 원소유자가 여전히 보유)
            emit AuctionFinalized(auctionId, address(0), 0);
        }
    }

    /**
     * @dev 내부 판매 처리 - 로열티 및 플랫폼 수수료 분배
     */
    function _processSale(
        uint256 tokenId,
        address seller,
        address buyer,
        uint256 salePrice
    ) internal {
        uint256 platformFee = (salePrice * platformFeePercent) / 10000;
        uint256 royaltyAmount = 0;
        address royaltyReceiver = address(0);

        // EIP-2981 로열티 정보 조회
        if (ebookNFT.supportsInterface(type(IERC2981).interfaceId)) {
            (royaltyReceiver, royaltyAmount) = ebookNFT.royaltyInfo(tokenId, salePrice);
            // 로열티 수신자가 판매자인 경우 로열티 없음 (최초 판매)
            if (royaltyReceiver == seller) {
                royaltyAmount = 0;
            }
        }

        uint256 sellerAmount = salePrice - platformFee - royaltyAmount;

        // NFT 전송
        ebookNFT.safeTransferFrom(seller, buyer, tokenId);

        // 수수료 분배
        payable(platformWallet).transfer(platformFee);
        if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
            payable(royaltyReceiver).transfer(royaltyAmount);
        }
        payable(seller).transfer(sellerAmount);

        emit Sold(listingCount - 1, tokenId, buyer, seller, salePrice, royaltyAmount, platformFee);
    }

    /**
     * @dev 환불 인출 (이전 입찰자)
     */
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    /**
     * @dev 판매 취소
     */
    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not seller");
        require(listing.isActive, "Already inactive");
        listing.isActive = false;
        emit ListingCancelled(listingId);
    }

    function getActiveListing() external view returns (Listing[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < listingCount; i++) {
            if (listings[i].isActive) activeCount++;
        }

        Listing[] memory active = new Listing[](activeCount);
        uint256 idx = 0;
        for (uint256 i = 0; i < listingCount; i++) {
            if (listings[i].isActive) {
                active[idx++] = listings[i];
            }
        }
        return active;
    }

    function getActiveAuctions() external view returns (Auction[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < auctionCount; i++) {
            if (auctions[i].isActive) activeCount++;
        }

        Auction[] memory active = new Auction[](activeCount);
        uint256 idx = 0;
        for (uint256 i = 0; i < auctionCount; i++) {
            if (auctions[i].isActive) {
                active[idx++] = auctions[i];
            }
        }
        return active;
    }

    function setPlatformFee(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= 500, "Max 5%");
        platformFeePercent = _feePercent;
    }

    function setPlatformWallet(address _wallet) external onlyOwner {
        platformWallet = _wallet;
    }
}
