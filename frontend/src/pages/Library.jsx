import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { BookOpen, Plus, Wallet, Library as LibraryIcon, Loader, Tag } from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import NFTCard from "../components/NFTCard";
import EbookReader from "../components/EbookReader";
import { Link } from "react-router-dom";

export default function Library() {
  const { account, contracts, connectWallet } = useWeb3();
  const [myBooks, setMyBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [readerState, setReaderState] = useState(null);
  const [pendingWithdrawal, setPendingWithdrawal] = useState("0");

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

  if (!account) {
    return (
      <div className="library-page container">
        <div className="library-empty">
          <Wallet size={64} className="empty-icon" />
          <h2>지갑 연결이 필요합니다</h2>
          <p>내 서재를 보려면 MetaMask 지갑을 연결해주세요.</p>
          <button className="btn btn-primary" onClick={connectWallet}>
            <Wallet size={18} /> 지갑 연결하기
          </button>
        </div>
      </div>
    );
  }

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
            <h1><LibraryIcon size={32} /> 내 서재</h1>
            <p className="wallet-address-display">{account}</p>
          </div>
          <div className="library-actions">
            {parseFloat(pendingWithdrawal) > 0 && (
              <button className="btn btn-secondary withdraw-btn" onClick={handleWithdraw}>
                💰 {pendingWithdrawal} ETH 인출
              </button>
            )}
            <Link to="/publish" className="btn btn-primary">
              <Plus size={16} /> 새 작품 출판
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="library-loading">
            <Loader size={32} className="spin" />
            <p>서재 로딩 중...</p>
          </div>
        ) : myBooks.length === 0 ? (
          <div className="library-empty-books">
            <BookOpen size={64} className="empty-icon" />
            <h2>아직 출판한 작품이 없습니다</h2>
            <p>첫 번째 작품을 출판해 NFT로 저작권을 등록해보세요!</p>
            <Link to="/publish" className="btn btn-primary">
              <Plus size={18} /> 첫 작품 출판하기
            </Link>
          </div>
        ) : (
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
