import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Search, Filter, Gavel, Tag, TrendingUp, RefreshCw, Loader } from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import NFTCard from "../components/NFTCard";
import EbookReader from "../components/EbookReader";

const SORT_OPTIONS = ["최신순", "가격 낮은순", "가격 높은순", "경매 종료 임박"];
const GENRE_FILTERS = ["전체", "시", "소설", "수필/에세이", "SF", "판타지", "기타"];

// 데모 데이터 (컨트랙트 미연결 시)
const DEMO_LISTINGS = [
  {
    id: 0, tokenId: 1n, seller: "0x1234...5678", price: ethers.parseEther("0.05"),
    title: "봄날의 시집", author: "김봄날", genre: "시", isActive: true,
    description: "계절의 변화와 인생의 순간들을 담은 75편의 서정시. 봄의 설렘부터 겨울의 고독까지.",
    epubIpfsHash: "QmDemo1...", royaltyPercent: 1000, isLimitedEdition: true, mintedCount: 3, totalEditions: 50,
  },
  {
    id: 1, tokenId: 2n, seller: "0xabcd...ef01", price: ethers.parseEther("0.12"),
    title: "기억의 도시", author: "이기억", genre: "소설", isActive: true,
    description: "디지털 기억이 거래되는 근미래 도시를 배경으로 한 SF 소설. 정체성과 기억의 의미를 탐구합니다.",
    epubIpfsHash: "QmDemo2...", royaltyPercent: 800, isLimitedEdition: false,
  },
  {
    id: 2, tokenId: 3n, seller: "0x9876...5432", price: ethers.parseEther("0.03"),
    title: "365일의 수필", author: "박수필", genre: "수필/에세이", isActive: true,
    description: "일상의 소소한 순간에서 발견한 삶의 지혜. 매일 하나씩, 1년간의 사유.",
    epubIpfsHash: "QmDemo3...", royaltyPercent: 1500, isLimitedEdition: true, mintedCount: 10, totalEditions: 100,
  },
];

const DEMO_AUCTIONS = [
  {
    id: 0, tokenId: 4n, seller: "0xfeed...cafe", startPrice: ethers.parseEther("0.08"),
    currentBid: ethers.parseEther("0.11"), highestBidder: "0xaaaa...bbbb",
    endTime: BigInt(Math.floor(Date.now() / 1000) + 7200),
    title: "달빛 소나타", author: "최달빛", genre: "시", isActive: true,
    description: "밤의 정적 속에서 피어나는 12편의 장시. 달과 별, 어둠과 빛의 대화.",
    epubIpfsHash: "QmDemo4...", royaltyPercent: 1000,
  },
];

export default function Marketplace() {
  const { account, contracts, signer } = useWeb3();
  const [listings, setListings] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("listings");
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("전체");
  const [sort, setSort] = useState("최신순");
  const [readerState, setReaderState] = useState(null);
  const [bidAmount, setBidAmount] = useState({});
  const [listPrice, setListPrice] = useState("");
  const [listTokenId, setListTokenId] = useState("");
  const [showListModal, setShowListModal] = useState(false);

  const loadMarketData = useCallback(async () => {
    if (!contracts.marketplace) {
      // 컨트랙트 없으면 데모 데이터
      setListings(DEMO_LISTINGS);
      setAuctions(DEMO_AUCTIONS);
      return;
    }

    setIsLoading(true);
    try {
      const [rawListings, rawAuctions] = await Promise.all([
        contracts.marketplace.getActiveListing(),
        contracts.marketplace.getActiveAuctions(),
      ]);

      // 각 NFT의 메타데이터 조회
      const enriched = await Promise.all(
        rawListings.map(async (l) => {
          try {
            const meta = await contracts.nft.getEbookData(l.tokenId);
            return { ...l, ...meta };
          } catch {
            return l;
          }
        })
      );

      const enrichedAuctions = await Promise.all(
        rawAuctions.map(async (a) => {
          try {
            const meta = await contracts.nft.getEbookData(a.tokenId);
            return { ...a, ...meta };
          } catch {
            return a;
          }
        })
      );

      setListings(enriched);
      setAuctions(enrichedAuctions);
    } catch (err) {
      console.error("마켓 데이터 로드 실패:", err);
      toast.error("데이터 로드 실패. 데모 데이터를 표시합니다.");
      setListings(DEMO_LISTINGS);
      setAuctions(DEMO_AUCTIONS);
    } finally {
      setIsLoading(false);
    }
  }, [contracts]);

  useEffect(() => { loadMarketData(); }, [loadMarketData]);

  const handleBuyNow = async (item) => {
    if (!account) return toast.error("지갑을 연결해주세요.");
    if (!contracts.marketplace) return toast.error("데모 모드: 실제 거래는 지갑 연결 후 가능합니다.");

    const toastId = toast.loading("구매 처리 중...");
    try {
      const tx = await contracts.marketplace.buyNow(item.id, { value: item.price });
      await tx.wait();
      toast.success("구매 완료!", { id: toastId });
      loadMarketData();
    } catch (err) {
      toast.error(err.code === 4001 ? "거래 취소됨" : `구매 실패: ${err.message}`, { id: toastId });
    }
  };

  const handleBid = async (item) => {
    if (!account) return toast.error("지갑을 연결해주세요.");
    if (!contracts.marketplace) return toast.error("데모 모드입니다.");
    const amount = bidAmount[item.id];
    if (!amount || parseFloat(amount) <= 0) return toast.error("입찰금액을 입력하세요.");

    const toastId = toast.loading("입찰 처리 중...");
    try {
      const valueWei = ethers.parseEther(amount);
      const tx = await contracts.marketplace.placeBid(item.id, { value: valueWei });
      await tx.wait();
      toast.success("입찰 완료!", { id: toastId });
      loadMarketData();
    } catch (err) {
      toast.error(`입찰 실패: ${err.message}`, { id: toastId });
    }
  };

  const handleListForSale = async () => {
    if (!account || !contracts.marketplace || !contracts.nft) {
      return toast.error("지갑과 컨트랙트가 필요합니다.");
    }
    if (!listTokenId || !listPrice) return toast.error("Token ID와 가격을 입력하세요.");

    const toastId = toast.loading("판매 등록 중...");
    try {
      // 마켓플레이스에 전송 권한 부여
      const approved = await contracts.nft.isApprovedForAll(account, contracts.marketplace.target);
      if (!approved) {
        const approveTx = await contracts.nft.setApprovalForAll(contracts.marketplace.target, true);
        await approveTx.wait();
      }
      const priceParsed = ethers.parseEther(listPrice);
      const tx = await contracts.marketplace.listForSale(listTokenId, priceParsed);
      await tx.wait();
      toast.success("판매 등록 완료!", { id: toastId });
      setShowListModal(false);
      loadMarketData();
    } catch (err) {
      toast.error(`등록 실패: ${err.message}`, { id: toastId });
    }
  };

  const handleRead = (item) => {
    if (item.epubIpfsHash) {
      const url = `https://gateway.pinata.cloud/ipfs/${item.epubIpfsHash}`;
      setReaderState({ url, title: item.title });
    } else {
      toast.error("epub 파일이 없습니다.");
    }
  };

  // 필터링
  const filterItems = (items) => {
    return items.filter(item => {
      const matchSearch = !search || [item.title, item.author, item.description]
        .some(s => s?.toLowerCase().includes(search.toLowerCase()));
      const matchGenre = genre === "전체" || item.genre === genre;
      return matchSearch && matchGenre;
    }).sort((a, b) => {
      if (sort === "가격 낮은순") return Number(a.price || a.startPrice) - Number(b.price || b.startPrice);
      if (sort === "가격 높은순") return Number(b.price || b.startPrice) - Number(a.price || a.startPrice);
      if (sort === "경매 종료 임박" && a.endTime) return Number(a.endTime) - Number(b.endTime);
      return Number(b.id || 0) - Number(a.id || 0);
    });
  };

  const filteredListings = filterItems(listings);
  const filteredAuctions = filterItems(auctions);

  return (
    <div className="marketplace-page">
      {/* ebook 리더 */}
      {readerState && (
        <EbookReader
          epubUrl={readerState.url}
          title={readerState.title}
          onClose={() => setReaderState(null)}
        />
      )}

      <div className="container">
        {/* 헤더 */}
        <div className="market-header">
          <div>
            <h1>NFT 저작권 거래소</h1>
            <p>블록체인으로 보증된 독립출판 ebook의 저작권을 거래하세요</p>
          </div>
          {account && (
            <button className="btn btn-primary" onClick={() => setShowListModal(true)}>
              <Tag size={16} /> 내 NFT 판매 등록
            </button>
          )}
        </div>

        {/* 통계 */}
        <div className="market-stats">
          <div className="stat-card glass-card">
            <Tag size={20} className="stat-icon" />
            <div>
              <div className="stat-num">{listings.length}</div>
              <div className="stat-label">고정가 판매</div>
            </div>
          </div>
          <div className="stat-card glass-card">
            <Gavel size={20} className="stat-icon" />
            <div>
              <div className="stat-num">{auctions.length}</div>
              <div className="stat-label">진행 중 경매</div>
            </div>
          </div>
          <div className="stat-card glass-card">
            <TrendingUp size={20} className="stat-icon" />
            <div>
              <div className="stat-num">
                {contracts.marketplace ? "Live" : "Demo"}
              </div>
              <div className="stat-label">네트워크 상태</div>
            </div>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="market-filters glass-card">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              className="search-input"
              placeholder="제목, 저자, 내용으로 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-row">
            <div className="genre-tabs">
              {GENRE_FILTERS.map(g => (
                <button
                  key={g}
                  className={`genre-tab ${genre === g ? "active" : ""}`}
                  onClick={() => setGenre(g)}
                >
                  {g}
                </button>
              ))}
            </div>

            <select
              className="form-input sort-select"
              value={sort}
              onChange={e => setSort(e.target.value)}
            >
              {SORT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <button className="btn btn-secondary refresh-btn" onClick={loadMarketData} disabled={isLoading}>
              <RefreshCw size={16} className={isLoading ? "spin" : ""} />
            </button>
          </div>
        </div>

        {/* 탭 */}
        <div className="market-tabs">
          <button
            className={`market-tab ${activeTab === "listings" ? "active" : ""}`}
            onClick={() => setActiveTab("listings")}
          >
            <Tag size={18} /> 고정가 판매 ({filteredListings.length})
          </button>
          <button
            className={`market-tab ${activeTab === "auctions" ? "active" : ""}`}
            onClick={() => setActiveTab("auctions")}
          >
            <Gavel size={18} /> 경매 ({filteredAuctions.length})
          </button>
        </div>

        {/* 상품 목록 */}
        {isLoading ? (
          <div className="market-loading">
            <Loader size={32} className="spin" />
            <p>마켓 데이터 로딩 중...</p>
          </div>
        ) : (
          <motion.div className="grid-cards" layout>
            {activeTab === "listings" && filteredListings.map((item, i) => (
              <motion.div key={item.id ?? i} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <NFTCard
                  item={item}
                  type="listing"
                  onBuy={handleBuyNow}
                  onRead={handleRead}
                  isOwner={item.seller?.toLowerCase() === account?.toLowerCase()}
                />
              </motion.div>
            ))}
            {activeTab === "auctions" && filteredAuctions.map((item, i) => (
              <motion.div key={item.id ?? i} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div>
                  <NFTCard
                    item={item}
                    type="auction"
                    onBid={handleBid}
                    onRead={handleRead}
                    isOwner={item.seller?.toLowerCase() === account?.toLowerCase()}
                  />
                  <div className="bid-input-row" style={{ marginTop: "8px" }}>
                    <input
                      className="form-input bid-input"
                      type="number"
                      step="0.001"
                      placeholder="입찰 금액 (ETH)"
                      value={bidAmount[item.id] || ""}
                      onChange={e => setBidAmount(prev => ({ ...prev, [item.id]: e.target.value }))}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
            {((activeTab === "listings" && filteredListings.length === 0) ||
              (activeTab === "auctions" && filteredAuctions.length === 0)) && (
              <div className="empty-state">
                <Gavel size={48} />
                <p>표시할 항목이 없습니다</p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* 판매 등록 모달 */}
      {showListModal && (
        <div className="modal-overlay" onClick={() => setShowListModal(false)}>
          <div className="modal-box glass-card" onClick={e => e.stopPropagation()}>
            <h2>NFT 판매 등록</h2>
            <div className="form-group">
              <label className="form-label">Token ID</label>
              <input className="form-input" type="number" placeholder="발행된 NFT Token ID"
                value={listTokenId} onChange={e => setListTokenId(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">판매가 (ETH)</label>
              <input className="form-input" type="number" step="0.001" placeholder="0.05"
                value={listPrice} onChange={e => setListPrice(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowListModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleListForSale}>
                <Tag size={16} /> 판매 등록
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .marketplace-page { padding: 48px 0 80px; }
        .market-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 32px; gap: 16px;
        }
        .market-header h1 { font-size: 2rem; font-weight: 700; font-family: var(--font-serif); margin-bottom: 6px; }
        .market-header p { color: #a5b4fc; }
        .market-stats {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 16px; margin-bottom: 24px;
        }
        .stat-card {
          padding: 20px; display: flex; align-items: center;
          gap: 16px;
        }
        .stat-icon { color: #6366f1; flex-shrink: 0; }
        .stat-num { font-size: 1.5rem; font-weight: 700; }
        .stat-label { font-size: 0.8rem; color: #9ca3af; }
        .market-filters { padding: 20px; margin-bottom: 24px; }
        .search-box {
          position: relative; margin-bottom: 16px;
        }
        .search-icon {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%); color: #6b7280; pointer-events: none;
        }
        .search-input {
          width: 100%; padding: 12px 16px 12px 44px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(99,102,241,0.3);
          border-radius: 10px; color: #e0e7ff;
          font-size: 1rem; outline: none;
          transition: border-color 0.2s;
        }
        .search-input:focus { border-color: #6366f1; }
        .search-input::placeholder { color: #6b7280; }
        .filter-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .genre-tabs { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
        .genre-tab {
          padding: 6px 14px; border-radius: 999px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #9ca3af; cursor: pointer; font-size: 0.85rem;
          transition: all 0.2s;
        }
        .genre-tab.active {
          background: rgba(99,102,241,0.2);
          border-color: #6366f1; color: #a5b4fc;
        }
        .sort-select { width: 150px; padding: 8px 12px; font-size: 0.9rem; }
        .refresh-btn { padding: 8px 12px; }
        .market-tabs {
          display: flex; gap: 4px; margin-bottom: 32px;
          border-bottom: 1px solid rgba(99,102,241,0.2);
          padding-bottom: 0;
        }
        .market-tab {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 24px;
          background: none; border: none;
          color: #9ca3af; cursor: pointer; font-size: 0.95rem;
          border-bottom: 2px solid transparent;
          transition: all 0.2s; margin-bottom: -1px;
        }
        .market-tab.active { color: #a5b4fc; border-bottom-color: #6366f1; }
        .market-loading {
          display: flex; flex-direction: column; align-items: center;
          gap: 16px; padding: 80px 0; color: #9ca3af;
        }
        .empty-state {
          grid-column: 1/-1; text-align: center;
          padding: 80px 0; color: #6b7280;
          display: flex; flex-direction: column; align-items: center; gap: 16px;
        }
        .bid-input-row { display: flex; }
        .bid-input { font-size: 0.9rem; padding: 10px 12px; border-radius: 10px; }

        /* 모달 */
        .modal-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0.7);
          display: flex; align-items: center; justify-content: center;
        }
        .modal-box { padding: 32px; max-width: 440px; width: 90%; }
        .modal-box h2 { font-size: 1.4rem; margin-bottom: 24px; }
        .modal-actions { display: flex; gap: 12px; margin-top: 24px; }
        .modal-actions .btn { flex: 1; justify-content: center; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }

        @media (max-width: 768px) {
          .market-stats { grid-template-columns: 1fr; }
          .market-header { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
