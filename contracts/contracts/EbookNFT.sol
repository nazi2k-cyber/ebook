// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EbookNFT
 * @dev ERC721 NFT 컨트랙트 - 전자책 저작권을 NFT로 발행
 * 로열티(EIP-2981) 지원: 재판매 시 원작자에게 자동 수수료 지급
 */
contract EbookNFT is ERC721, ERC721URIStorage, ERC721Royalty, Ownable {
    uint256 private _tokenIdCounter;

    // 플랫폼 수수료 (basis points, 250 = 2.5%)
    uint96 public platformFeePercent = 250;
    address public platformWallet;

    struct EbookMetadata {
        string title;
        string author;
        string genre;
        string description;
        string epubIpfsHash;   // IPFS에 저장된 epub 파일 해시
        string coverIpfsHash;  // 표지 이미지 IPFS 해시
        uint256 publishedAt;
        uint256 totalEditions; // 총 발행 부수 (0 = 무제한)
        uint256 mintedCount;   // 현재 발행된 수량
        bool isLimitedEdition;
    }

    // tokenId => EbookMetadata
    mapping(uint256 => EbookMetadata) public ebookData;

    // 저자 주소 => 발행한 tokenId 목록
    mapping(address => uint256[]) public authorBooks;

    // 콘텐츠 해시 => 이미 등록 여부 (중복 방지)
    mapping(string => bool) public registeredContent;

    event EbookMinted(
        uint256 indexed tokenId,
        address indexed author,
        string title,
        string epubIpfsHash,
        uint256 timestamp
    );

    event EbookTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );

    constructor(address _platformWallet)
        ERC721("EbookNFT", "EBNFT")
        Ownable(msg.sender)
    {
        platformWallet = _platformWallet;
    }

    /**
     * @dev 새로운 ebook NFT 발행
     * @param to 수신자 주소 (일반적으로 저자 자신)
     * @param tokenURI_ IPFS에 저장된 메타데이터 JSON URI
     * @param metadata ebook 메타데이터
     * @param royaltyFeePercent 로열티 비율 (basis points, 예: 1000 = 10%)
     */
    function mintEbook(
        address to,
        string memory tokenURI_,
        EbookMetadata memory metadata,
        uint96 royaltyFeePercent
    ) public returns (uint256) {
        require(bytes(metadata.title).length > 0, "Title cannot be empty");
        require(bytes(metadata.epubIpfsHash).length > 0, "EPUB hash required");
        require(!registeredContent[metadata.epubIpfsHash], "Content already registered");
        require(royaltyFeePercent <= 3000, "Royalty cannot exceed 30%");

        if (metadata.isLimitedEdition) {
            require(metadata.totalEditions > 0, "Limited edition needs total supply");
            require(metadata.mintedCount < metadata.totalEditions, "All editions minted");
        }

        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        _setTokenRoyalty(tokenId, msg.sender, royaltyFeePercent);

        metadata.publishedAt = block.timestamp;
        metadata.mintedCount = 1;
        ebookData[tokenId] = metadata;

        registeredContent[metadata.epubIpfsHash] = true;
        authorBooks[msg.sender].push(tokenId);

        emit EbookMinted(tokenId, msg.sender, metadata.title, metadata.epubIpfsHash, block.timestamp);

        return tokenId;
    }

    /**
     * @dev 한정판 ebook 추가 발행 (저자만 가능)
     */
    function mintAdditionalEdition(
        uint256 originalTokenId,
        address to,
        string memory newTokenURI
    ) public returns (uint256) {
        EbookMetadata storage original = ebookData[originalTokenId];
        require(original.isLimitedEdition, "Not a limited edition");
        require(original.mintedCount < original.totalEditions, "All editions minted");

        // 원본 토큰의 소유자만 추가 발행 가능
        require(ownerOf(originalTokenId) == msg.sender ||
                authorBooks[msg.sender].length > 0, "Not authorized");

        uint256 newTokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, newTokenURI);

        // 로열티 정보 복사
        (address royaltyReceiver, uint256 royaltyAmount) = royaltyInfo(originalTokenId, 10000);
        _setTokenRoyalty(newTokenId, royaltyReceiver, uint96(royaltyAmount));

        // 메타데이터 복사 및 카운터 증가
        ebookData[newTokenId] = original;
        ebookData[newTokenId].mintedCount = original.mintedCount + 1;
        original.mintedCount++;

        return newTokenId;
    }

    function getAuthorBooks(address author) public view returns (uint256[] memory) {
        return authorBooks[author];
    }

    function getEbookData(uint256 tokenId) public view returns (EbookMetadata memory) {
        return ebookData[tokenId];
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }

    function setPlatformWallet(address _platformWallet) public onlyOwner {
        platformWallet = _platformWallet;
    }

    function setPlatformFee(uint96 _feePercent) public onlyOwner {
        require(_feePercent <= 500, "Platform fee cannot exceed 5%");
        platformFeePercent = _feePercent;
    }

    // Override 필수 함수들
    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage, ERC721Royalty) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _burn(uint256 tokenId)
        internal override(ERC721, ERC721URIStorage, ERC721Royalty) {
        super._burn(tokenId);
    }

    // OZ v5: _update 훅으로 전송 이벤트 발행
    function _update(address to, uint256 tokenId, address auth)
        internal override(ERC721) returns (address)
    {
        address from = super._update(to, tokenId, auth);
        if (from != address(0) && to != address(0)) {
            emit EbookTransferred(tokenId, from, to, block.timestamp);
        }
        return from;
    }
}
