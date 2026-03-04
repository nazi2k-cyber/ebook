import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { BookOpen, Plus, Wallet, Library as LibraryIcon, Loader, Tag, Download, Trash2 } from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import NFTCard from "../components/NFTCard";
import EbookReader from "../components/EbookReader";
import { Link } from "react-router-dom";

// ── 로컬 서재 (localStorage) 헬퍼 ──────────────────────────
const LOCAL_KEY = "bookchain_local_library";

function getLocalBooks() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch { return []; }
}

function saveLocalBooks(books) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(books));
}

export default function Library() {
  const { account, contracts, connectWallet } = useWeb3();
  const [myBooks, setMyBooks] = useState([]);
  const [localBooks, setLocalBooks] = useState([]);
  const [activeTab, setActiveTab] = useState("local");
  const [isLoading, setIsLoading] = useState(false);
  const [readerState, setReaderState] = useState(null);
  const [pendingWithdrawal, setPendingWithdrawal] = useState("0");

  // 로컬 서재 로드
  useEffect(() => {
    setLocalBooks(getLocalBooks());
    // Home에서 EPUB 다운로드 이벤트 수신
    const handler = (e) => {
      const { title, author, filename, size } = e.detail || {};
      if (!title) return;
      const books = getLocalBooks();
      if (!books.find(b => b.filename === filename)) {
        const updated = [{ title, author, filename, size, savedAt: Date.now() }, ...books];
        saveLocalBooks(updated);
        setLocalBooks(updated);
      }
    };
    window.addEventListener("epubSaved", handler);
    return () => window.removeEventListener("epubSaved", handler);
  }, []);

  const loadMyBooks = useCallback(async () => {
    if (!account || !contracts.nft) return;
    setIsLoading(true);
    try {
      const tokenIds = await contracts.nft.getAuthorBooks(account);

      const books = await Promise.all(
        tokenIds.map(async (tokenId) => {
          const meta = await contracts.nft.getEbookData(tokenId);
          const owner = await contracts.nft.ownerOf(tokenId);
          const tokenUri = await contracts.nft.tokenURI(tokenId);
          const [royaltyReceiver, royaltyAmount] = await contracts.nft.royaltyInfo(tokenId, 10000n);
          return {
            tokenId,
            owner,
            tokenUri,
            royaltyPercent: Number(royaltyAmount),
            ...meta,
          };
        })
      );

      setMyBooks(books);

      if (contracts.marketplace) {
        const pending = await contracts.marketplace.pendingWithdrawals(account);
        setPendingWithdrawal(ethers.formatEther(pending));
      }
    } catch (err) {
      console.error("내 서재 로드 실패:", err);
      toast.error("데이터 로드 실패");
    } finally {
      setIsLoading(false);
    }
  }, [account, contracts]);

  useEffect(() => { loadMyBooks(); }, [loadMyBooks]);

  const handleWithdraw = async () => {
    if (!contracts.marketplace) return toast.error("컨트랙트 미연결");
    if (parseFloat(pendingWithdrawal) === 0) return toast.error("인출할 금액이 없습니다.");
    try {
      const tx = await contracts.marketplace.withdraw();
      await tx.wait();
      toast.success(`${pendingWithdrawal} ETH 인출 완료!`);
      setPendingWithdrawal("0");
    } catch (err) {
      toast.error(`인출 실패: ${err.message}`);
    }
  };

  const handleRead = (item) => {
    if (item.epubIpfsHash) {
      setReaderState({ url: `https://gateway.pinata.cloud/ipfs/${item.epubIpfsHash}`, title: item.title });
    } else {
      toast.error("epub 파일이 없습니다.");
    }
  };

  const deleteLocalBook = (filename) => {
    const updated = getLocalBooks().filter(b => b.filename !== filename);
    saveLocalBooks(updated);
    setLocalBooks(updated);
    toast.success("삭제됨");
  };

  return (
    <div className="library-page">
      {readerState && (
        <EbookReader
          epubUrl={readerState.url}
          title={readerState.title}
          onClose={() => setReaderState(null)}
        />
      )}

      <div className="container">
        <div className="library-header">
          <div>
            <h1><LibraryIcon size={28} /> 내 서재</h1>
            {account && <p className="wallet-address-display">{account}</p>}
          </div>
          <div className="library-actions">
            {account && parseFloat(pendingWithdrawal) > 0 && (
              <button className="btn btn-secondary withdraw-btn" onClick={handleWithdraw}>
                💰 {pendingWithdrawal} ETH 인출
              </button>
            )}
            <Link to="/publish" className="btn btn-primary">
              <Plus size={16} /> EPUB 만들기
            </Link>
          </div>
        </div>

        {/* 탭: 로컬 서재 / NFT 서재 */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid rgba(99,102,241,0.2)" }}>
          <button
            onClick={() => setActiveTab("local")}
            style={{
              padding: "10px 20px", background: "none", border: "none",
              color: activeTab === "local" ? "#e0e7ff" : "#6b7280",
              borderBottom: activeTab === "local" ? "2px solid #6366f1" : "2px solid transparent",
              cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", marginBottom: -1,
            }}
          >
            내 EPUB 파일 ({localBooks.length})
          </button>
          <button
            onClick={() => { setActiveTab("nft"); if (account) loadMyBooks(); }}
            style={{
              padding: "10px 20px", background: "none", border: "none",
              color: activeTab === "nft" ? "#e0e7ff" : "#6b7280",
              borderBottom: activeTab === "nft" ? "2px solid #6366f1" : "2px solid transparent",
              cursor: "pointer", fontWeight: 500, fontSize: "0.9rem", marginBottom: -1,
            }}
          >
            NFT 컬렉션 {account ? `(${myBooks.length})` : "(지갑 필요)"}
          </button>
        </div>

        {/* 로컬 서재 탭 */}
        {activeTab === "local" && (
          localBooks.length === 0 ? (
            <div className="library-empty-books">
              <BookOpen size={56} className="empty-icon" />
              <h2 style={{ fontSize: "1.3rem" }}>아직 변환한 파일이 없습니다</h2>
              <p>출판하기 페이지에서 문서를 EPUB으로 변환해보세요.</p>
              <Link to="/publish" className="btn btn-primary" style={{ marginTop: 8 }}>
                <Plus size={16} /> EPUB 만들기
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              {localBooks.map((book) => (
                <motion.div key={book.filename}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: "rgba(30,27,75,0.7)", border: "1px solid rgba(99,102,241,0.2)",
                    borderRadius: 16, padding: "20px",
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: "rgba(99,102,241,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 12,
                  }}>
                    <BookOpen size={22} style={{ color: "#6366f1" }} />
                  </div>
                  <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 4, color: "#e0e7ff" }}>
                    {book.title}
                  </p>
                  {book.author && (
                    <p style={{ color: "#9ca3af", fontSize: "0.82rem", marginBottom: 4 }}>{book.author}</p>
                  )}
                  <p style={{ color: "#6b7280", fontSize: "0.75rem", marginBottom: 14 }}>
                    {book.size ? `${(book.size / 1024).toFixed(0)}KB · ` : ""}
                    {new Date(book.savedAt).toLocaleDateString("ko-KR")}
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => deleteLocalBook(book.filename)}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "6px 10px", borderRadius: 8,
                        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                        color: "#f87171", cursor: "pointer", fontSize: "0.8rem",
                      }}
                    >
                      <Trash2 size={13} /> 삭제
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        )}

        {/* NFT 서재 탭 */}
        {activeTab === "nft" && !account && (
          <div className="library-empty">
            <Wallet size={56} className="empty-icon" />
            <h2 style={{ fontSize: "1.3rem" }}>NFT 서재는 지갑 연결이 필요합니다</h2>
            <p>MetaMask를 연결하면 블록체인에 등록된 내 NFT 작품을 볼 수 있습니다.</p>
            <button className="btn btn-primary" onClick={connectWallet}>
              <Wallet size={16} /> MetaMask 연결
            </button>
          </div>
        )}

        {activeTab === "nft" && account && isLoading ? (
          <div className="library-loading">
            <Loader size={32} className="spin" />
            <p>NFT 서재 로딩 중...</p>
          </div>
        ) : activeTab === "nft" && account && myBooks.length === 0 ? (
          <div className="library-empty-books">
            <BookOpen size={56} className="empty-icon" />
            <h2 style={{ fontSize: "1.3rem" }}>아직 발행한 NFT가 없습니다</h2>
            <p>EPUB을 만들고 NFT로 저작권을 등록해보세요.</p>
            <Link to="/publish" className="btn btn-primary" style={{ marginTop: 8 }}>
              <Plus size={16} /> 출판하기
            </Link>
          </div>
        ) : activeTab === "nft" && account && (
          <>
            <div className="library-summary glass-card">
              <div className="summary-stat">
                <span className="summary-num">{myBooks.length}</span>
                <span className="summary-label">발행한 작품</span>
              </div>
              <div className="summary-stat">
                <span className="summary-num">
                  {myBooks.filter(b => b.isLimitedEdition).length}
                </span>
                <span className="summary-label">한정판</span>
              </div>
              <div className="summary-stat">
                <span className="summary-num">
                  {myBooks.length > 0
                    ? `${(myBooks[0].royaltyPercent / 100).toFixed(1)}%`
                    : "0%"}
                </span>
                <span className="summary-label">평균 로열티</span>
              </div>
            </div>

            <motion.div className="grid-cards" layout>
              {myBooks.map((book, i) => (
                <motion.div key={book.tokenId?.toString()} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <NFTCard
                    item={{
                      ...book,
                      price: 0n,
                      id: i,
                    }}
                    type="listing"
                    onRead={handleRead}
                    isOwner={true}
                  />
                  <div className="token-info">
                    <span>Token ID: #{book.tokenId?.toString()}</span>
                    <Link to="/marketplace" className="list-btn">
                      <Tag size={12} /> 판매 등록
                    </Link>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </div>

      <style>{`
        .library-page { padding: 48px 0 80px; }
        .library-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 32px; gap: 16px;
        }
        .library-header h1 {
          display: flex; align-items: center; gap: 12px;
          font-size: 2rem; font-weight: 700; font-family: var(--font-serif); margin-bottom: 8px;
        }
        .wallet-address-display { font-size: 0.8rem; color: #6b7280; font-family: monospace; }
        .library-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .withdraw-btn { border-color: #f59e0b; color: #f59e0b; }

        .library-loading, .library-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 20px; padding: 100px 0; text-align: center; color: #9ca3af;
        }
        .empty-icon { color: rgba(99,102,241,0.3); }
        .library-empty h2, .library-empty-books h2 { font-size: 1.5rem; font-weight: 600; color: #e0e7ff; }
        .library-empty-books {
          display: flex; flex-direction: column; align-items: center;
          gap: 20px; padding: 100px 0; text-align: center;
        }

        .library-summary {
          display: flex; gap: 32px; padding: 24px 32px;
          margin-bottom: 32px; align-items: center;
        }
        .summary-stat { text-align: center; }
        .summary-num { display: block; font-size: 2rem; font-weight: 700; color: #6366f1; }
        .summary-label { font-size: 0.8rem; color: #9ca3af; }

        .token-info {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 16px; margin-top: -4px;
          background: rgba(99,102,241,0.05);
          border: 1px solid rgba(99,102,241,0.1);
          border-top: none;
          border-radius: 0 0 16px 16px;
          font-size: 0.8rem; color: #6b7280;
        }
        .list-btn {
          display: flex; align-items: center; gap: 4px;
          color: #6366f1; font-size: 0.8rem; font-weight: 500;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }

        @media (max-width: 768px) {
          .library-header { flex-direction: column; }
          .library-summary { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}
