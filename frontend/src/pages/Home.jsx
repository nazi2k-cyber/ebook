import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, BookOpen, Download, Check, Loader, ArrowRight,
  FileText, Image, Star, ChevronRight, Wallet,
} from "lucide-react";
import { generateEpubClient } from "../utils/clientEpub";
import { useWeb3 } from "../context/Web3Context";

// ── 데모 도서 데이터 ─────────────────────────────────────────
const DEMO_BOOKS = [
  { id: 1, title: "봄날의 시", author: "이지은", genre: "시", color: "#f4a261", emoji: "🌸" },
  { id: 2, title: "도시 산책자", author: "박민준", genre: "에세이", color: "#2a9d8f", emoji: "🏙️" },
  { id: 3, title: "별빛 소나타", author: "김서연", genre: "소설", color: "#6366f1", emoji: "🌙" },
  { id: 4, title: "나의 작은 레시피", author: "최예은", genre: "에세이", color: "#e76f51", emoji: "🍳" },
  { id: 5, title: "우리 동네 이야기", author: "정하늘", genre: "동화", color: "#457b9d", emoji: "🏘️" },
  { id: 6, title: "SF 단편 모음집", author: "한우주", genre: "SF", color: "#8338ec", emoji: "🚀" },
];

const STEPS = [
  {
    n: "01",
    icon: <Upload size={28} />,
    title: "문서 업로드",
    desc: "TXT, DOCX, PDF, MD 파일을 올려주세요. 드래그 앤 드롭으로 간편하게!",
    color: "#f4a261",
  },
  {
    n: "02",
    icon: <BookOpen size={28} />,
    title: "EPUB 자동 변환",
    desc: "제목·저자·표지를 입력하면 브라우저에서 바로 전자책 파일이 완성됩니다.",
    color: "#2a9d8f",
  },
  {
    n: "03",
    icon: <Download size={28} />,
    title: "즉시 다운로드",
    desc: "완성된 EPUB을 저장해 리디북스, 애플북스, 칼리버에서 바로 읽어보세요.",
    color: "#6366f1",
  },
];

const GENRES = ["시", "소설", "수필/에세이", "SF", "판타지", "기타"];

// ── 미니 변환 위젯 ────────────────────────────────────────────
function MiniConvert() {
  const [step, setStep] = useState(0);
  const [docFile, setDocFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverUrl, setCoverUrl] = useState(null);
  const [form, setForm] = useState({ title: "", author: "", genre: "소설" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const onDocDrop = useCallback((files) => {
    const f = files[0];
    if (!f) return;
    setDocFile(f);
    setForm(p => ({ ...p, title: p.title || f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ") }));
    setStep(1);
    toast.success("파일 선택됨!");
  }, []);

  const onCoverDrop = useCallback((files) => {
    const f = files[0];
    if (!f) return;
    setCoverFile(f);
    setCoverUrl(URL.createObjectURL(f));
  }, []);

  const { getRootProps: dRP, getInputProps: dIP, isDragActive: dDrag } = useDropzone({
    onDrop: onDocDrop,
    accept: { "text/plain": [".txt"], "text/markdown": [".md"], "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] },
    maxFiles: 1,
  });

  const { getRootProps: cRP, getInputProps: cIP } = useDropzone({
    onDrop: onCoverDrop, accept: { "image/*": [] }, maxFiles: 1,
  });

  const generate = async () => {
    if (!form.title.trim() || !form.author.trim()) {
      toast.error("제목과 저자명을 입력하세요."); return;
    }
    setLoading(true);
    const tid = toast.loading("EPUB 생성 중...");
    try {
      const r = await generateEpubClient(docFile, { ...form, coverFile: coverFile || null });
      setResult(r);
      toast.success("완성!", { id: tid });
      setStep(2);
    } catch (e) {
      toast.error(e.message, { id: tid });
    } finally { setLoading(false); }
  };

  const download = () => {
    const url = URL.createObjectURL(result.blob);
    Object.assign(document.createElement("a"), { href: url, download: result.filename }).click();
    URL.revokeObjectURL(url);
    toast.success("다운로드 시작!");
  };

  const reset = () => {
    if (coverUrl) URL.revokeObjectURL(coverUrl);
    setStep(0); setDocFile(null); setCoverFile(null); setCoverUrl(null);
    setResult(null); setForm({ title: "", author: "", genre: "소설" });
  };

  return (
    <div className="mc-wrap">
      {/* 스텝 헤더 */}
      <div className="mc-steps">
        {["파일 선택", "정보 입력", "다운로드"].map((l, i) => (
          <div key={i} className={`mc-step ${i === step ? "mc-cur" : ""} ${i < step ? "mc-done" : ""}`}>
            <span className="mc-dot">{i < step ? <Check size={11} /> : i + 1}</span>
            <span>{l}</span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div {...dRP()} className={`mc-drop ${dDrag ? "mc-drag" : ""}`}>
              <input {...dIP()} />
              <Upload size={36} className="mc-drop-icon" />
              <p className="mc-drop-main">파일을 드래그하거나 클릭해서 선택</p>
              <p className="mc-drop-sub">TXT · DOCX · PDF · MD 지원</p>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="mc-file-badge">
              <FileText size={15} /> {docFile?.name}
              <button onClick={() => { setDocFile(null); setStep(0); }} className="mc-change">변경</button>
            </div>
            <div className="mc-form">
              <input className="mc-input" placeholder="책 제목 *" value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              <input className="mc-input" placeholder="저자명 *" value={form.author}
                onChange={e => setForm(p => ({ ...p, author: e.target.value }))} />
              <select className="mc-input" value={form.genre}
                onChange={e => setForm(p => ({ ...p, genre: e.target.value }))}>
                {GENRES.map(g => <option key={g}>{g}</option>)}
              </select>
              <div {...cRP()} className="mc-cover">
                <input {...cIP()} />
                {coverUrl
                  ? <img src={coverUrl} alt="표지" style={{ width: 36, height: 48, objectFit: "cover", borderRadius: 4 }} />
                  : <><Image size={16} /> 표지 이미지 (선택)</>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="mc-btn-sec" onClick={() => setStep(0)}>← 이전</button>
              <button className="mc-btn-pri" onClick={generate} disabled={loading} style={{ flex: 1 }}>
                {loading
                  ? <><Loader size={16} style={{ animation: "spin .8s linear infinite" }} /> 생성 중...</>
                  : <><BookOpen size={16} /> EPUB 만들기</>}
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && result && (
          <motion.div key="s2" initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: "center" }}>
            <div className="mc-success-icon"><Check size={28} /></div>
            <p className="mc-success-title">EPUB 완성!</p>
            <p className="mc-success-meta">{result.chapters}챕터 · {(result.blob.size / 1024).toFixed(0)}KB</p>
            <button className="mc-btn-pri" onClick={download} style={{ width: "100%", justifyContent: "center", marginBottom: 8 }}>
              <Download size={16} /> EPUB 다운로드
            </button>
            <button onClick={reset} className="mc-reset">+ 새 파일 변환</button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .mc-wrap { padding: 4px 0; }
        .mc-steps { display: flex; gap: 0; margin-bottom: 18px; }
        .mc-step {
          display: flex; align-items: center; gap: 7px;
          flex: 1; font-size: .8rem; color: #9b8e7e;
        }
        .mc-dot {
          width: 22px; height: 22px; border-radius: 50%;
          background: #f0ebe3; border: 1.5px solid #d4c5b0;
          display: flex; align-items: center; justify-content: center;
          font-size: .72rem; font-weight: 700; flex-shrink: 0;
          transition: all .2s;
        }
        .mc-cur { color: #5c3d2e; }
        .mc-cur .mc-dot { background: #f4a261; border-color: #f4a261; color: white; }
        .mc-done .mc-dot { background: #2a9d8f; border-color: #2a9d8f; color: white; }
        .mc-done { color: #2a9d8f; }

        .mc-drop {
          border: 2px dashed #d4c5b0; border-radius: 14px;
          padding: 36px 20px; text-align: center; cursor: pointer;
          background: #fdf9f4; transition: all .2s;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
        }
        .mc-drop:hover, .mc-drag { border-color: #f4a261; background: #fef5eb; }
        .mc-drop-icon { color: #f4a261; }
        .mc-drop-main { font-size: .92rem; color: #5c3d2e; font-weight: 600; }
        .mc-drop-sub { font-size: .78rem; color: #9b8e7e; }

        .mc-file-badge {
          display: flex; align-items: center; gap: 8px;
          font-size: .83rem; color: #5c3d2e; margin-bottom: 12px;
          padding: 8px 12px; background: #fef5eb;
          border: 1px solid #f4c99c; border-radius: 8px;
        }
        .mc-change { margin-left: auto; background: none; border: none; color: #9b8e7e; cursor: pointer; font-size: .75rem; }
        .mc-form { display: flex; flex-direction: column; gap: 8px; }
        .mc-input {
          width: 100%; padding: 10px 13px;
          background: #fdf9f4; border: 1.5px solid #e8ddd1;
          border-radius: 10px; color: #2c2c2c; font-size: .9rem;
          outline: none; font-family: var(--font-sans);
          transition: border-color .2s;
        }
        .mc-input:focus { border-color: #f4a261; }
        .mc-cover {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 13px; border: 1.5px dashed #d4c5b0;
          border-radius: 10px; cursor: pointer; font-size: .85rem;
          color: #9b8e7e; background: #fdf9f4; transition: .2s;
        }
        .mc-cover:hover { border-color: #f4a261; }

        .mc-btn-pri {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 11px 22px; border-radius: 10px;
          background: #f4a261; color: white; border: none;
          font-weight: 700; font-size: .92rem; cursor: pointer;
          transition: background .2s; font-family: var(--font-sans);
        }
        .mc-btn-pri:hover { background: #e8813a; }
        .mc-btn-pri:disabled { opacity: .6; cursor: not-allowed; }
        .mc-btn-sec {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 11px 16px; border-radius: 10px;
          background: #f0ebe3; color: #5c3d2e; border: none;
          font-weight: 500; font-size: .9rem; cursor: pointer;
          font-family: var(--font-sans);
        }
        .mc-success-icon {
          width: 60px; height: 60px; border-radius: 50%;
          background: #d8f3ef; color: #2a9d8f;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 12px;
        }
        .mc-success-title { font-size: 1.2rem; font-weight: 700; color: #5c3d2e; margin-bottom: 4px; }
        .mc-success-meta { font-size: .8rem; color: #9b8e7e; margin-bottom: 16px; }
        .mc-reset {
          background: none; border: none; color: #9b8e7e;
          cursor: pointer; font-size: .82rem; width: 100%;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── 메인 홈 페이지 ────────────────────────────────────────────
export default function Home() {
  const { account, connectWallet } = useWeb3();
  const [bookIndex, setBookIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setBookIndex(i => (i + 1) % DEMO_BOOKS.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="hp">
      {/* ── 히어로 ── */}
      <section className="hp-hero">
        <div className="container hp-hero-inner">
          <motion.div className="hp-hero-text"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55 }}>
            <p className="hp-eyebrow">✦ 누구나 작가가 될 수 있습니다</p>
            <h1 className="hp-headline">
              내 글을<br />
              <span className="hp-accent">전자책</span>으로,<br />
              지금 바로
            </h1>
            <p className="hp-sub">
              문서 파일만 있으면 충분합니다.<br />
              5분 안에 나만의 EPUB 전자책을 완성하세요.
            </p>
            <div className="hp-cta-row">
              <Link to="/publish" className="hp-btn-primary">
                무료로 시작하기 <ArrowRight size={16} />
              </Link>
              <Link to="/marketplace" className="hp-btn-ghost">
                도서 둘러보기
              </Link>
            </div>
            <p className="hp-note">가입 불필요 · 완전 무료 · 서버 전송 없음</p>
          </motion.div>

          {/* 히어로 오른쪽 - 책 슬라이드 */}
          <motion.div className="hp-hero-book"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .6, delay: .15 }}>
            <div className="hp-book-stack">
              {DEMO_BOOKS.slice(0, 3).map((b, i) => (
                <motion.div
                  key={b.id}
                  className="hp-book-card"
                  style={{
                    background: b.color,
                    transform: `rotate(${(i - 1) * 5}deg) translateX(${(i - 1) * 12}px)`,
                    zIndex: 3 - i,
                  }}
                  animate={{ rotate: (i - 1) * 5 + (bookIndex * 2), transition: { duration: 1.5 } }}
                >
                  <div className="hp-book-emoji">{b.emoji}</div>
                  <p className="hp-book-title">{b.title}</p>
                  <p className="hp-book-author">{b.author}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 통계 바 ── */}
      <section className="hp-stats">
        <div className="container hp-stats-inner">
          {[
            { v: "5가지", l: "지원 파일 형식" },
            { v: "100%", l: "무료 · 무제한" },
            { v: "EPUB", l: "표준 전자책 포맷" },
            { v: "즉시", l: "브라우저에서 바로 변환" },
          ].map(s => (
            <div key={s.l} className="hp-stat">
              <span className="hp-stat-v">{s.v}</span>
              <span className="hp-stat-l">{s.l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 지금 변환하기 위젯 ── */}
      <section className="hp-convert-section">
        <div className="container hp-convert-inner">
          <motion.div className="hp-convert-text"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}>
            <p className="hp-section-tag">⚡ 지금 바로 변환</p>
            <h2 className="hp-section-title">파일만 올리면<br />전자책이 됩니다</h2>
            <p className="hp-section-desc">
              복잡한 프로그램 설치 필요 없어요.<br />
              브라우저에서 바로, 무료로, 즉시 EPUB이 완성됩니다.<br />
              파일은 서버로 전송되지 않아 안전합니다.
            </p>
            <div className="hp-convert-features">
              {["TXT, DOCX, PDF, MD 지원", "표지 이미지 자동 삽입", "챕터 자동 분리 · 목차 생성", "한글 EPUB 3.0 표준 준수"].map(f => (
                <div key={f} className="hp-cf">
                  <Check size={14} style={{ color: "#2a9d8f", flexShrink: 0 }} />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div className="hp-widget-card"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: .1 }}>
            <MiniConvert />
          </motion.div>
        </div>
      </section>

      {/* ── 이용 방법 ── */}
      <section className="hp-how">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p className="hp-section-tag">📖 이용 방법</p>
            <h2 className="hp-section-title">3단계면 충분합니다</h2>
          </div>
          <div className="hp-steps">
            {STEPS.map((s, i) => (
              <motion.div key={s.n} className="hp-step-card"
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * .1 }}>
                <div className="hp-step-num" style={{ color: s.color, background: `${s.color}18` }}>
                  {s.icon}
                </div>
                <div className="hp-step-label" style={{ color: s.color }}>{s.n}</div>
                <h3 className="hp-step-title">{s.title}</h3>
                <p className="hp-step-desc">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 도서 갤러리 ── */}
      <section className="hp-gallery">
        <div className="container">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
            <div>
              <p className="hp-section-tag">📚 도서 갤러리</p>
              <h2 className="hp-section-title" style={{ marginBottom: 0 }}>작가들의 작품</h2>
            </div>
            <Link to="/marketplace" className="hp-link-btn">
              전체 보기 <ChevronRight size={16} />
            </Link>
          </div>
          <div className="hp-book-grid">
            {DEMO_BOOKS.map((book, i) => (
              <motion.div key={book.id} className="hp-book-item"
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * .06 }}>
                <div className="hp-book-cover" style={{ background: `${book.color}22`, borderColor: `${book.color}44` }}>
                  <span className="hp-book-emoji-lg">{book.emoji}</span>
                </div>
                <div className="hp-book-info">
                  <span className="hp-genre-tag">{book.genre}</span>
                  <p className="hp-book-name">{book.title}</p>
                  <p className="hp-book-auth">{book.author}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 블록체인 기능 (선택사항으로 소개) ── */}
      <section className="hp-blockchain">
        <div className="container hp-blockchain-inner">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}>
            <p className="hp-section-tag" style={{ color: "#6366f1" }}>🔗 선택 기능</p>
            <h2 className="hp-section-title">저작권을 블록체인에 기록하세요</h2>
            <p className="hp-section-desc">
              MetaMask 지갑을 연결하면 EPUB을 NFT로 발행해 저작권을 영구 등록할 수 있습니다.<br />
              EPUB 변환은 지갑 없이도 100% 무료로 이용 가능합니다.
            </p>
            <div className="hp-chain-features">
              {[
                { icon: "🔒", t: "IPFS 영구 저장", d: "분산 저장소에 영구 보관" },
                { icon: "📜", t: "NFT 저작권 등록", d: "ERC-721 표준 블록체인 기록" },
                { icon: "💰", t: "자동 로열티", d: "재판매 시 자동 정산 (EIP-2981)" },
                { icon: "🏪", t: "NFT 거래소", d: "고정가 판매 및 경매" },
              ].map(f => (
                <div key={f.t} className="hp-chain-card">
                  <span className="hp-chain-emoji">{f.icon}</span>
                  <div>
                    <p className="hp-chain-title">{f.t}</p>
                    <p className="hp-chain-desc">{f.d}</p>
                  </div>
                </div>
              ))}
            </div>
            {!account && (
              <button onClick={connectWallet} className="hp-btn-ghost" style={{ marginTop: 20 }}>
                <Wallet size={16} /> MetaMask 연결 (선택)
              </button>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── 최종 CTA ── */}
      <section className="hp-final-cta">
        <div className="container" style={{ textAlign: "center" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p style={{ fontSize: "2.5rem", marginBottom: 16 }}>📖</p>
            <h2 style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800, color: "#3d2b1f", marginBottom: 12, fontFamily: "var(--font-serif)" }}>
              지금 바로 내 책을 만들어보세요
            </h2>
            <p style={{ color: "#7a6355", fontSize: "1rem", marginBottom: 28, lineHeight: 1.7 }}>
              가입도 결제도 필요 없습니다.<br />
              파일 하나면 오늘 당신도 작가입니다.
            </p>
            <Link to="/publish" className="hp-btn-primary" style={{ fontSize: "1.05rem", padding: "14px 40px" }}>
              무료로 전자책 만들기 <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>

      <style>{`
        /* ── 전체 홈 래퍼 ── */
        .hp {
          background: #faf8f4;
          color: #2c2c2c;
          min-height: 100vh;
          padding-bottom: 0;
        }

        /* ── 히어로 ── */
        .hp-hero {
          padding: 72px 0 64px;
          background: linear-gradient(160deg, #fff9f2 0%, #faf5ec 60%, #f5ede0 100%);
          border-bottom: 1px solid #ede3d4;
        }
        .hp-hero-inner {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: center;
        }
        .hp-eyebrow {
          font-size: .82rem; color: #c97d3a; font-weight: 600;
          letter-spacing: .04em; margin-bottom: 16px;
          text-transform: uppercase;
        }
        .hp-headline {
          font-size: clamp(2.2rem, 5vw, 3.2rem);
          font-weight: 900;
          line-height: 1.18;
          font-family: var(--font-serif);
          color: #3d2b1f;
          margin-bottom: 18px;
        }
        .hp-accent { color: #f4a261; }
        .hp-sub {
          font-size: 1.05rem; color: #7a6355; line-height: 1.75;
          margin-bottom: 28px;
        }
        .hp-cta-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
        .hp-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 28px; border-radius: 12px;
          background: #f4a261; color: white; font-weight: 700;
          font-size: .95rem; text-decoration: none; border: none;
          cursor: pointer; transition: background .2s; font-family: var(--font-sans);
          white-space: nowrap;
        }
        .hp-btn-primary:hover { background: #e8813a; color: white; }
        .hp-btn-ghost {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 12px 22px; border-radius: 12px;
          background: transparent; color: #5c3d2e;
          border: 1.5px solid #d4c5b0; font-weight: 600;
          font-size: .92rem; text-decoration: none; cursor: pointer;
          transition: all .2s; font-family: var(--font-sans);
        }
        .hp-btn-ghost:hover { background: #f4a26120; border-color: #f4a261; }
        .hp-note { font-size: .78rem; color: #b0a090; }

        /* 책 스택 */
        .hp-hero-book {
          display: flex; align-items: center; justify-content: center;
          height: 280px; position: relative;
        }
        .hp-book-stack {
          position: relative; width: 180px; height: 240px;
        }
        .hp-book-card {
          position: absolute; width: 160px; height: 220px;
          border-radius: 12px; padding: 24px 16px;
          box-shadow: 0 12px 32px rgba(0,0,0,0.15);
          display: flex; flex-direction: column;
          justify-content: flex-end;
          top: 0; left: 0;
        }
        .hp-book-emoji { font-size: 2.2rem; margin-bottom: 8px; }
        .hp-book-title { font-size: .85rem; font-weight: 700; color: rgba(255,255,255,0.95); margin-bottom: 2px; font-family: var(--font-serif); }
        .hp-book-author { font-size: .72rem; color: rgba(255,255,255,0.75); }

        /* ── 통계 바 ── */
        .hp-stats {
          background: #3d2b1f;
          padding: 28px 0;
        }
        .hp-stats-inner {
          display: flex; gap: 0;
          justify-content: space-around; flex-wrap: wrap; gap: 16px;
        }
        .hp-stat { display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .hp-stat-v { font-size: 1.4rem; font-weight: 800; color: #f4a261; font-family: var(--font-serif); }
        .hp-stat-l { font-size: .75rem; color: #c4a882; }

        /* ── 변환 섹션 ── */
        .hp-convert-section {
          padding: 88px 0;
          background: #fff;
        }
        .hp-convert-inner {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 56px; align-items: center;
        }
        .hp-section-tag {
          font-size: .78rem; font-weight: 600; color: #c97d3a;
          text-transform: uppercase; letter-spacing: .06em; margin-bottom: 10px;
        }
        .hp-section-title {
          font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 800;
          color: #3d2b1f; font-family: var(--font-serif);
          line-height: 1.3; margin-bottom: 16px;
        }
        .hp-section-desc {
          font-size: .95rem; color: #7a6355; line-height: 1.8; margin-bottom: 20px;
        }
        .hp-convert-features { display: flex; flex-direction: column; gap: 10px; }
        .hp-cf { display: flex; align-items: center; gap: 9px; font-size: .88rem; color: #5c3d2e; }

        .hp-widget-card {
          background: #fdf9f4;
          border: 1.5px solid #ede3d4;
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 4px 24px rgba(92,61,46,0.08);
        }

        /* ── 이용 방법 ── */
        .hp-how { padding: 88px 0; background: #faf8f4; }
        .hp-steps {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
        }
        .hp-step-card {
          background: white; border-radius: 18px; padding: 28px 24px;
          border: 1.5px solid #ede3d4;
          box-shadow: 0 2px 12px rgba(92,61,46,0.06);
          transition: transform .2s, box-shadow .2s;
        }
        .hp-step-card:hover { transform: translateY(-4px); box-shadow: 0 8px 28px rgba(92,61,46,0.12); }
        .hp-step-num {
          width: 54px; height: 54px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 16px;
        }
        .hp-step-label { font-size: .72rem; font-weight: 700; margin-bottom: 8px; letter-spacing: .08em; }
        .hp-step-title { font-size: 1.05rem; font-weight: 700; color: #3d2b1f; margin-bottom: 10px; font-family: var(--font-serif); }
        .hp-step-desc { font-size: .85rem; color: #7a6355; line-height: 1.7; }

        /* ── 도서 갤러리 ── */
        .hp-gallery { padding: 88px 0; background: #fff; }
        .hp-link-btn {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: .88rem; color: #c97d3a; font-weight: 600;
          text-decoration: none; padding: 8px 16px;
          background: #fef5eb; border-radius: 8px; border: 1px solid #f4c99c;
          transition: .2s; white-space: nowrap;
        }
        .hp-link-btn:hover { background: #f4a261; color: white; border-color: #f4a261; }

        .hp-book-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .hp-book-item {
          background: #fdf9f4; border: 1.5px solid #ede3d4;
          border-radius: 14px; overflow: hidden; transition: .2s;
        }
        .hp-book-item:hover { border-color: #f4a261; transform: translateY(-2px); }
        .hp-book-cover {
          height: 140px; display: flex; align-items: center; justify-content: center;
          border-bottom: 1px solid #ede3d4;
        }
        .hp-book-emoji-lg { font-size: 3rem; }
        .hp-book-info { padding: 14px 16px; }
        .hp-genre-tag {
          font-size: .7rem; padding: 2px 8px; border-radius: 999px;
          background: #fef5eb; color: #c97d3a; font-weight: 600; margin-bottom: 6px;
          display: inline-block;
        }
        .hp-book-name { font-size: .9rem; font-weight: 700; color: #3d2b1f; margin-bottom: 2px; font-family: var(--font-serif); }
        .hp-book-auth { font-size: .78rem; color: #9b8e7e; }

        /* ── 블록체인 섹션 ── */
        .hp-blockchain {
          padding: 88px 0;
          background: linear-gradient(160deg, #f5f0fe 0%, #faf8f4 100%);
          border-top: 1px solid #ede3d4;
        }
        .hp-blockchain-inner { max-width: 720px; }
        .hp-chain-features { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 28px; }
        .hp-chain-card {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 16px; background: white; border-radius: 12px;
          border: 1.5px solid #e8e0f5;
        }
        .hp-chain-emoji { font-size: 1.4rem; flex-shrink: 0; }
        .hp-chain-title { font-size: .88rem; font-weight: 700; color: #3d2b1f; margin-bottom: 2px; }
        .hp-chain-desc { font-size: .77rem; color: #9b8e7e; }

        /* ── 최종 CTA ── */
        .hp-final-cta {
          padding: 88px 0;
          background: linear-gradient(160deg, #fff9f0 0%, #ffefd8 100%);
          border-top: 1px solid #ede3d4;
        }

        /* ── 반응형 ── */
        @media (max-width: 900px) {
          .hp-hero-inner { grid-template-columns: 1fr; }
          .hp-hero-book { display: none; }
          .hp-convert-inner { grid-template-columns: 1fr; }
          .hp-steps { grid-template-columns: 1fr; }
          .hp-book-grid { grid-template-columns: repeat(2, 1fr); }
          .hp-chain-features { grid-template-columns: 1fr; }
        }
        @media (max-width: 540px) {
          .hp-hero { padding: 48px 0 40px; }
          .hp-book-grid { grid-template-columns: 1fr; }
          .hp-cta-row { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}
