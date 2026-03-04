const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("배포 계정:", deployer.address);
  console.log("잔액:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // 1. EbookNFT 컨트랙트 배포
  console.log("\n📚 EbookNFT 컨트랙트 배포 중...");
  const EbookNFT = await ethers.getContractFactory("EbookNFT");
  const ebookNFT = await EbookNFT.deploy(deployer.address);
  await ebookNFT.waitForDeployment();
  const ebookNFTAddress = await ebookNFT.getAddress();
  console.log("✅ EbookNFT 배포 완료:", ebookNFTAddress);

  // 2. EbookMarketplace 컨트랙트 배포
  console.log("\n🏪 EbookMarketplace 컨트랙트 배포 중...");
  const EbookMarketplace = await ethers.getContractFactory("EbookMarketplace");
  const marketplace = await EbookMarketplace.deploy(ebookNFTAddress, deployer.address);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ EbookMarketplace 배포 완료:", marketplaceAddress);

  // 배포 정보 저장
  const deployInfo = {
    network: network.name,
    deployer: deployer.address,
    contracts: {
      EbookNFT: ebookNFTAddress,
      EbookMarketplace: marketplaceAddress,
    },
    deployedAt: new Date().toISOString(),
  };

  const fs = require("fs");
  const path = require("path");
  const deployPath = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deployPath)) fs.mkdirSync(deployPath, { recursive: true });

  fs.writeFileSync(
    path.join(deployPath, `${network.name}.json`),
    JSON.stringify(deployInfo, null, 2)
  );

  // 프론트엔드용 ABI 및 주소 내보내기
  const frontendPath = path.join(__dirname, "../../frontend/src/contracts");
  if (!fs.existsSync(frontendPath)) fs.mkdirSync(frontendPath, { recursive: true });

  const nftArtifact = await artifacts.readArtifact("EbookNFT");
  const marketArtifact = await artifacts.readArtifact("EbookMarketplace");

  fs.writeFileSync(
    path.join(frontendPath, "EbookNFT.json"),
    JSON.stringify({ address: ebookNFTAddress, abi: nftArtifact.abi }, null, 2)
  );

  fs.writeFileSync(
    path.join(frontendPath, "EbookMarketplace.json"),
    JSON.stringify({ address: marketplaceAddress, abi: marketArtifact.abi }, null, 2)
  );

  console.log("\n✅ 프론트엔드 컨트랙트 정보 내보내기 완료");
  console.log("\n📋 배포 요약:");
  console.log("   EbookNFT:", ebookNFTAddress);
  console.log("   EbookMarketplace:", marketplaceAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
