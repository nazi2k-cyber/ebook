import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";

const Web3Context = createContext(null);

// 컨트랙트 ABI (배포 전 플레이스홀더 - 실제 배포 후 교체)
const EBOOK_NFT_ABI = [
  "function mintEbook(address to, string tokenURI, tuple(string title, string author, string genre, string description, string epubIpfsHash, string coverIpfsHash, uint256 publishedAt, uint256 totalEditions, uint256 mintedCount, bool isLimitedEdition) metadata, uint96 royaltyFeePercent) returns (uint256)",
  "function getAuthorBooks(address author) view returns (uint256[])",
  "function getEbookData(uint256 tokenId) view returns (tuple(string title, string author, string genre, string description, string epubIpfsHash, string coverIpfsHash, uint256 publishedAt, uint256 totalEditions, uint256 mintedCount, bool isLimitedEdition))",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function royaltyInfo(uint256 tokenId, uint256 salePrice) view returns (address, uint256)",
  "event EbookMinted(uint256 indexed tokenId, address indexed author, string title, string epubIpfsHash, uint256 timestamp)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

const MARKETPLACE_ABI = [
  "function listForSale(uint256 tokenId, uint256 price)",
  "function buyNow(uint256 listingId) payable",
  "function createAuction(uint256 tokenId, uint256 startPrice, uint256 durationInHours)",
  "function placeBid(uint256 auctionId) payable",
  "function finalizeAuction(uint256 auctionId)",
  "function cancelListing(uint256 listingId)",
  "function withdraw()",
  "function getActiveListing() view returns (tuple(uint256 tokenId, address seller, uint256 price, bool isActive, uint256 listedAt, uint8 listingType)[])",
  "function getActiveAuctions() view returns (tuple(uint256 tokenId, address seller, uint256 startPrice, uint256 currentBid, address highestBidder, uint256 startTime, uint256 endTime, bool isActive, bool isFinalized)[])",
  "function listings(uint256) view returns (uint256 tokenId, address seller, uint256 price, bool isActive, uint256 listedAt, uint8 listingType)",
  "function pendingWithdrawals(address) view returns (uint256)",
  "event Listed(uint256 indexed listingId, uint256 indexed tokenId, address indexed seller, uint256 price, uint8 listingType)",
  "event Sold(uint256 indexed listingId, uint256 indexed tokenId, address indexed buyer, address seller, uint256 price, uint256 royaltyPaid, uint256 platformFee)",
  "event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount)",
];

// 네트워크 설정
const SUPPORTED_NETWORKS = {
  31337: { name: "Hardhat 로컬", currency: "ETH" },
  11155111: { name: "Sepolia 테스트넷", currency: "ETH" },
  80001: { name: "Mumbai 테스트넷", currency: "MATIC" },
};

export function Web3Provider({ children }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [contracts, setContracts] = useState({ nft: null, marketplace: null });
  const [balance, setBalance] = useState("0");

  // 컨트랙트 주소 (배포 후 환경변수 또는 deployments/에서 로드)
  const NFT_ADDRESS = import.meta.env.VITE_NFT_ADDRESS || "";
  const MARKETPLACE_ADDRESS = import.meta.env.VITE_MARKETPLACE_ADDRESS || "";

  const initContracts = useCallback((signerOrProvider) => {
    if (!NFT_ADDRESS || !MARKETPLACE_ADDRESS) return;
    try {
      const nft = new ethers.Contract(NFT_ADDRESS, EBOOK_NFT_ABI, signerOrProvider);
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signerOrProvider);
      setContracts({ nft, marketplace });
    } catch (e) {
      console.error("컨트랙트 초기화 실패:", e);
    }
  }, [NFT_ADDRESS, MARKETPLACE_ADDRESS]);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      toast.error("MetaMask를 설치해주세요.");
      window.open("https://metamask.io/download/", "_blank");
      return;
    }

    setIsConnecting(true);
    try {
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      await web3Provider.send("eth_requestAccounts", []);
      const web3Signer = await web3Provider.getSigner();
      const address = await web3Signer.getAddress();
      const network = await web3Provider.getNetwork();
      const bal = await web3Provider.getBalance(address);

      setProvider(web3Provider);
      setSigner(web3Signer);
      setAccount(address);
      setChainId(Number(network.chainId));
      setBalance(ethers.formatEther(bal));

      initContracts(web3Signer);
      toast.success(`지갑 연결: ${address.slice(0, 6)}...${address.slice(-4)}`);
    } catch (err) {
      if (err.code === 4001) {
        toast.error("지갑 연결을 거부했습니다.");
      } else {
        toast.error(`지갑 연결 실패: ${err.message}`);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [initContracts]);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
    setBalance("0");
    setContracts({ nft: null, marketplace: null });
    toast.success("지갑 연결 해제");
  }, []);

  // MetaMask 이벤트 리스너
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== account) {
        setAccount(accounts[0]);
        if (provider) {
          const bal = await provider.getBalance(accounts[0]);
          setBalance(ethers.formatEther(bal));
          const newSigner = await provider.getSigner();
          setSigner(newSigner);
          initContracts(newSigner);
        }
      }
    };

    const handleChainChanged = (chainIdHex) => {
      setChainId(parseInt(chainIdHex, 16));
      window.location.reload(); // 네트워크 변경 시 새로고침
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [account, provider, disconnectWallet, initContracts]);

  // 자동 연결 시도 (이미 연결된 경우)
  useEffect(() => {
    const tryAutoConnect = async () => {
      if (!window.ethereum) return;
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
          const web3Provider = new ethers.BrowserProvider(window.ethereum);
          const web3Signer = await web3Provider.getSigner();
          const network = await web3Provider.getNetwork();
          const bal = await web3Provider.getBalance(accounts[0]);

          setProvider(web3Provider);
          setSigner(web3Signer);
          setAccount(accounts[0]);
          setChainId(Number(network.chainId));
          setBalance(ethers.formatEther(bal));
          initContracts(web3Signer);
        }
      } catch (e) {
        console.log("자동 연결 실패 (정상):", e.message);
      }
    };
    tryAutoConnect();
  }, [initContracts]);

  const networkName = chainId ? (SUPPORTED_NETWORKS[chainId]?.name || `체인 ID: ${chainId}`) : null;
  const isWrongNetwork = chainId && !SUPPORTED_NETWORKS[chainId];

  const value = {
    account,
    provider,
    signer,
    chainId,
    networkName,
    isWrongNetwork,
    isConnecting,
    contracts,
    balance,
    connectWallet,
    disconnectWallet,
    NFT_ADDRESS,
    MARKETPLACE_ADDRESS,
    EBOOK_NFT_ABI,
    MARKETPLACE_ABI,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) throw new Error("useWeb3 must be used within Web3Provider");
  return context;
}
