import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Upload, Zap, Shield, Globe, ChevronRight, Sparkles } from "lucide-react";

const FEATURES = [
  {
    icon: <Upload size={28} />,
    title: "다양한 형식 지원",
    desc: "TXT, DOCX, PDF, Markdown 등 다양한 형식의 창작 문서를 EPUB으로 자동 변환합니다.",
    color: "#6366f1",
  },
  {
    icon: <Zap size={28} />,
    title: "NFT 저작권 등록",
    desc: "ERC-721 NFT로 저작권을 블록체인에 영구 등록. 재판매 시 자동 로열티(EIP-2981) 지급.",
    color: "#8b5cf6",
  },
  {
    icon: <BookOpen size={28} />,
    title: "내장 ebook 리더",
    desc: "다크/라이트/세피아 테마, 폰트 크기 조절 등 편안한 독서 환경을 제공합니다.",
    color: "#ec4899",
  },
  {
    icon: <Shield size={28} />,
    title: "저작권 보호",
    desc: "콘텐츠 해시를 스마트 컨트랙트에 기록해 중복 등록을 방지하고 진본성을 증명합니다.",
    color: "#10b981",
  },
  {
    icon: <Globe size={28} />,
    title: "탈중앙 거래",
    desc: "NFT 마켓플레이스에서 고정가 판매 또는 경매 방식으로 저작권을 거래합니다.",
    color: "#f59e0b",
  },
  {
    icon: <Sparkles size={28} />,
    title: "1인 독립출판",
    desc: "출판사 없이 누구나 자신의 작품을 출판하고 독자와 직접 만날 수 있습니다.",
    color: "#06b6d4",
  },
];

const STEPS = [
  { num: "01", title: "문서 업로드", desc: "창작 문서(시, 소설, 수필 등)를 업로드합니다" },
  { num: "02", title: "EPUB 생성", desc: "서지정보를 입력하면 epub 파일이 자동 생성됩니다" },
  { num: "03", title: "IPFS 저장", desc: "epub 파일을 분산 저장소(IPFS)에 영구 보관합니다" },
  { num: "04", title: "NFT 발행", desc: "저작권 NFT를 블록체인에 민팅합니다" },
  { num: "05", title: "거래 & 수익", desc: "NFT 거래소에서 작품을 판매하고 로열티를 받습니다" },
];

export default function Home() {
  return (
    <div className="home-page">
      {/* 히어로 섹션 */}
      <section className="hero">
        <div className="hero-content container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="hero-badge">
              <Sparkles size={14} />
              블록체인 기반 1인 독립출판 플랫폼
            </div>
            <h1 className="hero-title">
              당신의 이야기를<br />
              <span className="gradient-text">영원히 기록하세요</span>
            </h1>
            <p className="hero-desc">
              창작문을 epub으로 변환하고, NFT로 저작권을 등록해
              블록체인 기반 거래소에서 직접 판매하세요.
              중간 출판사 없는 진정한 1인 출판의 시대.
            </p>
            <div className="hero-actions">
              <Link to="/publish" className="btn btn-primary hero-cta">
                <Upload size={18} />
                지금 출판하기
                <ChevronRight size={18} />
              </Link>
              <Link to="/marketplace" className="btn btn-secondary hero-cta">
                <Globe size={18} />
                거래소 둘러보기
              </Link>
            </div>

            <div className="hero-stats">
              <div className="stat">
                <span className="stat-value">5가지</span>
                <span className="stat-label">지원 형식</span>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <span className="stat-value">EIP-2981</span>
                <span className="stat-label">자동 로열티</span>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <span className="stat-value">IPFS</span>
                <span className="stat-label">영구 보관</span>
              </div>
            </div>
          </motion.div>

          {/* 히어로 일러스트 */}
          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="book-stack">
              {["시집", "소설", "수필집", "에세이"].map((genre, i) => (
                <div
                  key={genre}
                  className="book-spine"
                  style={{
                    transform: `rotate(${(i - 1.5) * 8}deg)`,
                    background: `hsl(${240 + i * 20}, 70%, ${25 + i * 5}%)`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                >
                  <span>{genre}</span>
                  <div className="book-nft-dot" />
                </div>
              ))}
              <div className="chain-animation">
                <div className="chain-link" />
                <div className="chain-link" />
                <div className="chain-link" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 특징 섹션 */}
      <section className="features-section container">
        <h2 className="section-title">플랫폼 특징</h2>
        <div className="grid-cards features-grid">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              className="feature-card glass-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="feature-icon" style={{ color: f.color, background: `${f.color}15` }}>
                {f.icon}
              </div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 작동 방식 섹션 */}
      <section className="how-it-works container">
        <h2 className="section-title">어떻게 작동하나요?</h2>
        <div className="steps-container">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              className="step-item"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="step-num">{step.num}</div>
              <div className="step-content">
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
              </div>
              {i < STEPS.length - 1 && <div className="step-connector" />}
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="cta-section container">
        <div className="cta-card glass-card">
          <h2>지금 바로 시작하세요</h2>
          <p>MetaMask 지갑만 있으면 누구나 1인 독립출판사가 될 수 있습니다.</p>
          <Link to="/publish" className="btn btn-primary" style={{ fontSize: "1.1rem", padding: "14px 32px" }}>
            <Upload size={20} />
            무료로 출판하기 시작
          </Link>
        </div>
      </section>

      <style>{`
        .home-page { padding-bottom: 80px; }

        /* 히어로 */
        .hero {
          padding: 80px 0 60px;
          position: relative;
          overflow: hidden;
        }
        .hero::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -20%;
          width: 60%;
          height: 200%;
          background: radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .hero-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: center;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(99,102,241,0.15);
          border: 1px solid rgba(99,102,241,0.3);
          border-radius: 999px;
          padding: 6px 16px;
          font-size: 0.8rem;
          color: #a5b4fc;
          margin-bottom: 24px;
        }
        .hero-title {
          font-size: clamp(2rem, 4vw, 3.2rem);
          font-weight: 800;
          line-height: 1.2;
          margin-bottom: 20px;
          font-family: var(--font-serif);
          color: #e0e7ff;
        }
        .hero-desc {
          font-size: 1.05rem;
          color: #a5b4fc;
          line-height: 1.8;
          margin-bottom: 36px;
        }
        .hero-actions { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 40px; }
        .hero-cta { padding: 13px 24px; font-size: 1rem; }
        .hero-stats {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .stat { text-align: center; }
        .stat-value { display: block; font-size: 1.1rem; font-weight: 700; color: #e0e7ff; }
        .stat-label { font-size: 0.75rem; color: #6b7280; }
        .stat-divider { width: 1px; height: 36px; background: rgba(99,102,241,0.3); }

        /* 책 스택 일러스트 */
        .hero-visual { display: flex; justify-content: center; }
        .book-stack {
          position: relative;
          width: 280px;
          height: 320px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 8px;
        }
        .book-spine {
          width: 56px;
          height: 240px;
          border-radius: 4px 8px 8px 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: default;
          transition: transform 0.3s ease;
          box-shadow: 4px 4px 16px rgba(0,0,0,0.4);
          position: relative;
          animation: bookFloat 3s ease-in-out infinite alternate;
        }
        @keyframes bookFloat {
          from { transform: translateY(0) rotate(var(--r, 0deg)); }
          to { transform: translateY(-8px) rotate(var(--r, 0deg)); }
        }
        .book-spine span {
          writing-mode: vertical-rl;
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255,255,255,0.9);
          letter-spacing: 0.1em;
        }
        .book-nft-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 8px; height: 8px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 8px #10b981;
        }
        .chain-animation {
          position: absolute;
          bottom: -20px;
          display: flex;
          gap: 4px;
        }
        .chain-link {
          width: 20px; height: 12px;
          border: 2px solid rgba(99,102,241,0.5);
          border-radius: 6px;
        }

        /* 특징 */
        .features-section {
          padding: 80px 0;
        }
        .section-title {
          font-size: 2rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: 48px;
          font-family: var(--font-serif);
        }
        .feature-card {
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: transform 0.2s;
        }
        .feature-card:hover { transform: translateY(-4px); }
        .feature-icon {
          width: 56px; height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .feature-title { font-size: 1.05rem; font-weight: 600; }
        .feature-desc { font-size: 0.9rem; color: #9ca3af; line-height: 1.7; }

        /* 작동 방식 */
        .how-it-works { padding: 0 0 80px; }
        .steps-container { display: flex; flex-direction: column; gap: 0; max-width: 600px; margin: 0 auto; }
        .step-item {
          display: flex;
          gap: 20px;
          align-items: flex-start;
          position: relative;
          padding-bottom: 32px;
        }
        .step-num {
          font-size: 2rem;
          font-weight: 800;
          color: rgba(99,102,241,0.5);
          font-family: monospace;
          flex-shrink: 0;
          width: 56px;
          text-align: right;
        }
        .step-content {}
        .step-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 4px; }
        .step-desc { font-size: 0.9rem; color: #9ca3af; line-height: 1.6; }
        .step-connector {
          position: absolute;
          left: 47px;
          top: 48px;
          bottom: 0;
          width: 2px;
          background: linear-gradient(180deg, rgba(99,102,241,0.5), rgba(99,102,241,0.1));
        }

        /* CTA */
        .cta-section { padding: 0 0 20px; }
        .cta-card {
          padding: 56px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        .cta-card h2 { font-size: 2rem; font-weight: 700; font-family: var(--font-serif); }
        .cta-card p { color: #a5b4fc; font-size: 1.05rem; }

        @media (max-width: 768px) {
          .hero-content { grid-template-columns: 1fr; }
          .hero-visual { display: none; }
          .cta-card { padding: 32px 24px; }
        }
      `}</style>
    </div>
  );
}
