import React, { useState } from "react";
import { ethers } from "ethers";
import { BookOpen, Tag, Clock, Gavel, User, ExternalLink, Play } from "lucide-react";

export default function NFTCard({ item, type = "listing", onBuy, onBid, onRead, isOwner = false }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isAuction = type === "auction";

  const price = isAuction
    ? (item.currentBid > 0n ? item.currentBid : item.startPrice)
    : item.price;

  const priceInEth = price ? ethers.formatEther(price) : "0";

  const timeRemaining = isAuction && item.endTime
    ? getTimeRemaining(Number(item.endTime))
    : null;

  return (
    <div className={`nft-card ${isExpanded ? "expanded" : ""}`}>
      {/* 표지 이미지 / 플레이스홀더 */}
      <div className="nft-cover">
        {item.coverUrl ? (
          <img src={item.coverUrl} alt={item.title} className="cover-image" />
        ) : (
          <div className="cover-placeholder">
            <BookOpen size={48} />
            <span className="cover-genre">{item.genre || "문학"}</span>
          </div>
        )}

        {/* NFT 배지 */}
        <div className="nft-badge">NFT</div>

        {/* 한정판 배지 */}
        {item.isLimitedEdition && (
          <div className="limited-badge">
            한정판 {item.mintedCount}/{item.totalEditions}
          </div>
        )}
      </div>

      {/* 카드 본문 */}
      <div className="nft-body">
        <div className="nft-header">
          <h3 className="nft-title">{item.title || "제목 없음"}</h3>
          <p className="nft-author">
            <User size={12} /> {item.author || "저자 미상"}
          </p>
        </div>

        {item.genre && (
          <span className="badge badge-primary" style={{ marginBottom: "12px", display: "inline-block" }}>
            {item.genre}
          </span>
        )}

        {item.description && (
          <p className={`nft-description ${isExpanded ? "expanded" : ""}`}>
            {item.description}
          </p>
        )}

        {/* 가격 정보 */}
        <div className="nft-price-section">
          <div className="price-info">
            {isAuction ? (
              <>
                <Gavel size={14} className="price-icon" />
                <div>
                  <div className="price-label">
                    {item.currentBid > 0n ? "현재 입찰가" : "시작가"}
                  </div>
                  <div className="price-value">{priceInEth} ETH</div>
                </div>
              </>
            ) : (
              <>
                <Tag size={14} className="price-icon" />
                <div>
                  <div className="price-label">판매가</div>
                  <div className="price-value">{priceInEth} ETH</div>
                </div>
              </>
            )}
          </div>

          {/* 경매 남은 시간 */}
          {timeRemaining && (
            <div className="time-remaining">
              <Clock size={12} />
              <span>{timeRemaining}</span>
            </div>
          )}
        </div>

        {/* 로열티 정보 */}
        {item.royaltyPercent && (
          <div className="royalty-info">
            저작권 로열티: {(item.royaltyPercent / 100).toFixed(1)}%
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="nft-actions">
          {onRead && (
            <button className="btn btn-secondary action-btn" onClick={() => onRead(item)}>
              <Play size={14} /> 읽기
            </button>
          )}

          {!isOwner && (
            isAuction ? (
              <button
                className="btn btn-primary action-btn"
                onClick={() => onBid?.(item)}
                disabled={timeRemaining === "종료"}
              >
                <Gavel size={14} /> 입찰하기
              </button>
            ) : (
              <button
                className="btn btn-primary action-btn"
                onClick={() => onBuy?.(item)}
              >
                <Tag size={14} /> 구매하기
              </button>
            )
          )}

          {item.epubIpfsHash && (
            <a
              href={`https://gateway.pinata.cloud/ipfs/${item.epubIpfsHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary action-btn"
              title="IPFS에서 보기"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>

        {item.description && item.description.length > 80 && (
          <button
            className="expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "접기 ▲" : "더 보기 ▼"}
          </button>
        )}
      </div>

      <style>{`
        .nft-card {
          background: var(--color-bg-card, #1e1b4b);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
        }
        .nft-card:hover {
          transform: translateY(-4px);
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 12px 40px rgba(99, 102, 241, 0.2);
        }
        .nft-cover {
          position: relative;
          height: 200px;
          overflow: hidden;
          background: linear-gradient(135deg, #1a1730, #312e81);
        }
        .cover-image {
          width: 100%; height: 100%;
          object-fit: cover;
        }
        .cover-placeholder {
          width: 100%; height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: rgba(165, 180, 252, 0.4);
        }
        .cover-genre {
          font-size: 0.8rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .nft-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
          letter-spacing: 0.1em;
        }
        .limited-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          background: rgba(245, 158, 11, 0.9);
          color: #1a1a1a;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
        }
        .nft-body {
          padding: 18px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .nft-header { flex: 0 0 auto; }
        .nft-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #e0e7ff;
          margin-bottom: 4px;
          font-family: var(--font-serif, serif);
        }
        .nft-author {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.85rem;
          color: #a5b4fc;
        }
        .nft-description {
          font-size: 0.88rem;
          color: #9ca3af;
          line-height: 1.6;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .nft-description.expanded {
          display: block;
          -webkit-line-clamp: unset;
        }
        .nft-price-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: rgba(99, 102, 241, 0.1);
          border-radius: 10px;
          margin-top: auto;
        }
        .price-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .price-icon { color: #6366f1; flex-shrink: 0; }
        .price-label { font-size: 0.75rem; color: #9ca3af; }
        .price-value { font-size: 1.1rem; font-weight: 700; color: #e0e7ff; }
        .time-remaining {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          color: #f59e0b;
        }
        .royalty-info {
          font-size: 0.75rem;
          color: #10b981;
          text-align: right;
        }
        .nft-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .action-btn {
          flex: 1;
          min-width: 80px;
          padding: 8px 12px;
          font-size: 0.85rem;
          justify-content: center;
        }
        .expand-btn {
          background: none;
          border: none;
          color: #6366f1;
          font-size: 0.8rem;
          cursor: pointer;
          padding: 0;
          text-align: left;
        }
      `}</style>
    </div>
  );
}

function getTimeRemaining(endTimestamp) {
  const now = Math.floor(Date.now() / 1000);
  const diff = endTimestamp - now;
  if (diff <= 0) return "종료";
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  if (hours > 24) return `${Math.floor(hours / 24)}일 ${hours % 24}시간`;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
}
