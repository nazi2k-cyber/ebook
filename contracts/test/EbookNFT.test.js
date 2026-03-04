const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EbookNFT", function () {
  let EbookNFT, ebookNFT;
  let EbookMarketplace, marketplace;
  let owner, author, buyer, platform;

  const SAMPLE_METADATA = {
    title: "봄날의 시집",
    author: "김봄날",
    genre: "시",
    description: "서정시 모음집",
    epubIpfsHash: "QmTestHash123456789",
    coverIpfsHash: "",
    publishedAt: 0n,
    totalEditions: 100n,
    mintedCount: 0n,
    isLimitedEdition: true,
  };

  beforeEach(async function () {
    [owner, author, buyer, platform] = await ethers.getSigners();

    EbookNFT = await ethers.getContractFactory("EbookNFT");
    ebookNFT = await EbookNFT.deploy(platform.address);
    await ebookNFT.waitForDeployment();

    EbookMarketplace = await ethers.getContractFactory("EbookMarketplace");
    marketplace = await EbookMarketplace.deploy(
      await ebookNFT.getAddress(),
      platform.address
    );
    await marketplace.waitForDeployment();
  });

  describe("NFT 발행 (Minting)", function () {
    it("ebook NFT를 성공적으로 발행해야 함", async function () {
      const tx = await ebookNFT.connect(author).mintEbook(
        author.address,
        "ipfs://QmMetadataHash",
        SAMPLE_METADATA,
        1000 // 10% 로열티
      );
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      const balance = await ebookNFT.balanceOf(author.address);
      expect(balance).to.equal(1n);
    });

    it("발행된 NFT의 메타데이터가 올바르게 저장되어야 함", async function () {
      await ebookNFT.connect(author).mintEbook(
        author.address,
        "ipfs://QmMetadataHash",
        SAMPLE_METADATA,
        1000
      );

      const data = await ebookNFT.getEbookData(0);
      expect(data.title).to.equal(SAMPLE_METADATA.title);
      expect(data.author).to.equal(SAMPLE_METADATA.author);
      expect(data.epubIpfsHash).to.equal(SAMPLE_METADATA.epubIpfsHash);
    });

    it("동일한 EPUB 해시로 중복 발행을 방지해야 함", async function () {
      await ebookNFT.connect(author).mintEbook(
        author.address, "ipfs://QmMeta1", SAMPLE_METADATA, 1000
      );

      await expect(
        ebookNFT.connect(author).mintEbook(
          author.address, "ipfs://QmMeta2", SAMPLE_METADATA, 1000
        )
      ).to.be.revertedWith("Content already registered");
    });

    it("30% 초과 로열티는 거부해야 함", async function () {
      await expect(
        ebookNFT.connect(author).mintEbook(
          author.address, "ipfs://QmMeta", SAMPLE_METADATA, 3001
        )
      ).to.be.revertedWith("Royalty cannot exceed 30%");
    });

    it("EIP-2981 로열티 정보를 반환해야 함", async function () {
      await ebookNFT.connect(author).mintEbook(
        author.address, "ipfs://QmMeta", SAMPLE_METADATA, 1000
      );

      const [receiver, amount] = await ebookNFT.royaltyInfo(0, ethers.parseEther("1"));
      expect(receiver).to.equal(author.address);
      // 10% of 1 ETH = 0.1 ETH
      expect(amount).to.equal(ethers.parseEther("0.1"));
    });
  });

  describe("마켓플레이스 거래", function () {
    let tokenId;

    beforeEach(async function () {
      await ebookNFT.connect(author).mintEbook(
        author.address, "ipfs://QmMeta", SAMPLE_METADATA, 1000
      );
      tokenId = 0n;

      // 마켓플레이스에 전송 권한 부여
      await ebookNFT.connect(author).setApprovalForAll(
        await marketplace.getAddress(), true
      );
    });

    it("NFT를 마켓에 등록하고 즉시 구매할 수 있어야 함", async function () {
      const price = ethers.parseEther("0.1");
      await marketplace.connect(author).listForSale(tokenId, price);

      const platformBalanceBefore = await ethers.provider.getBalance(platform.address);

      await marketplace.connect(buyer).buyNow(0, { value: price });

      const newOwner = await ebookNFT.ownerOf(tokenId);
      expect(newOwner).to.equal(buyer.address);

      // 플랫폼 수수료 (2.5%) 확인
      const platformBalanceAfter = await ethers.provider.getBalance(platform.address);
      const fee = (price * 250n) / 10000n;
      expect(platformBalanceAfter - platformBalanceBefore).to.equal(fee);
    });

    it("경매를 생성하고 입찰할 수 있어야 함", async function () {
      const startPrice = ethers.parseEther("0.05");
      await marketplace.connect(author).createAuction(tokenId, startPrice, 24);

      const bidAmount = ethers.parseEther("0.06");
      await marketplace.connect(buyer).placeBid(0, { value: bidAmount });

      const auction = await marketplace.auctions(0);
      expect(auction.highestBidder).to.equal(buyer.address);
      expect(auction.currentBid).to.equal(bidAmount);
    });

    it("판매 등록을 취소할 수 있어야 함", async function () {
      await marketplace.connect(author).listForSale(tokenId, ethers.parseEther("0.1"));
      await marketplace.connect(author).cancelListing(0);
      const listing = await marketplace.listings(0);
      expect(listing.isActive).to.equal(false);
    });
  });

  describe("저자 정보 조회", function () {
    it("저자의 모든 발행 작품을 조회할 수 있어야 함", async function () {
      const meta2 = { ...SAMPLE_METADATA, epubIpfsHash: "QmSecondHash" };

      await ebookNFT.connect(author).mintEbook(author.address, "ipfs://Meta1", SAMPLE_METADATA, 1000);
      await ebookNFT.connect(author).mintEbook(author.address, "ipfs://Meta2", meta2, 800);

      const authorBooks = await ebookNFT.getAuthorBooks(author.address);
      expect(authorBooks.length).to.equal(2);
    });
  });
});
