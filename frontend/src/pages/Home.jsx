import React, { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { ethers } from "ethers";
import axios from "axios";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, BookOpen, Zap, Globe, Sparkles, Check, Loader,
  ChevronRight, ChevronLeft, Tag, Gavel, Clock, User,
  Moon, Sun, List, X, ZoomIn, ZoomOut, Settings,
  Download, Eye, RefreshCw, Wallet, Library, FileText,
  Image, AlertCircle, ExternalLink, Play, TrendingUp
} from "lucide-react";
import ePub from "epubjs";
import { useWeb3 } from "../context/Web3Context";

// ─────────────────────────────────────────────────────────────
// 상수 & 데모 데이터
// ─────────────────────────────────────────────────────────────
const GENRES = ["시", "소설", "수필/에세이", "SF", "판타지", "로맨스", "희곡", "동화", "기타"];

const DEMO_BOOKS = [
  {
    id: 0, tokenId: 1n, price: ethers.parseEther("0.05"),
    title: "봄날의 시집", author: "김봄날", genre: "시",
    description: "계절의 변화와 인생의 순간들을 담은 75편의 서정시.",
    royaltyPercent: 1000, isLimitedEdition: true, mintedCount: 3, totalEditions: 50,
    cover: null, epubUrl: null,
  },
  {
    id: 1, tokenId: 2n, price: ethers.parseEther("0.12"),
    title: "기억의 도시", author: "이기억", genre: "소설",
    description: "디지털 기억이 거래되는 근미래 도시. 정체성과 기억의 의미를 탐구합니다.",
    royaltyPercent: 800, isLimitedEdition: false,
    cover: null, epubUrl: null,
  },
  {
    id: 2, tokenId: 3n, price: ethers.parseEther("0.03"),
    title: "365일의 수필", author: "박수필", genre: "수필/에세이",
    description: "일상의 소소한 순간에서 발견한 삶의 지혜. 매일 하나씩, 1년간의 사유.",
    royaltyPercent: 1500, isLimitedEdition: true, mintedCount: 10, totalEditions: 100,
    cover: null, epubUrl: null,
  },
  {
    id: 3, tokenId: 4n, price: ethers.parseEther("0.08"),
    title: "달빛 소나타", author: "최달빛", genre: "시",
    description: "밤의 정적 속에서 피어나는 12편의 장시. 달과 별, 어둠과 빛의 대화.",
    royaltyPercent: 1000, isLimitedEdition: false,
    cover: null, epubUrl: null,
    isAuction: true, currentBid: ethers.parseEther("0.11"),
    endTime: BigInt(Math.floor(Date.now() / 1000) + 7200),
  },
];

// ─────────────────────────────────────────────────────────────
// 내장 ebook 리더 (모달)
// ─────────────────────────────────────────────────────────────
function EbookReaderModal({ epubUrl, title, onClose }) {
  const viewerRef = useRef(null);
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [toc, setToc] = useState([]);
  const [showToc, setShowToc] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [theme, setTheme] = useState("dark");

  const THEMES = {
    dark: { bg: "#0f0e17", color: "#e0e7ff", name: "다크" },
    light: { bg: "#fefefe", color: "#1a1a2e", name: "라이트" },
    sepia: { bg: "#f4ecd8", color: "#3b2f2f", name: "세피아" },
  };

  const applyTheme = useCallback((r, size, t) => {
    if (!r) return;
    r.themes.default({
      body: {
        background: THEMES[t].bg, color: THEMES[t].color,
        "font-family": '"Noto Serif KR", Georgia, serif',
        "font-size": `${size}px`, "line-height": "1.9",
        padding: "0 6%", "max-width": "680px", margin: "0 auto",
      },
      p: { "text-indent": "1.5em", "margin-bottom": "0.6em" },
      h1: { "text-align": "center", "font-size": "1.8em", "margin": "2em 0 1em" },
      h2: { "font-size": "1.4em", "margin": "1.5em 0 0.8em" },
    });
  }, []);

  useEffect(() => {
    if (!viewerRef.current || !epubUrl) return;
    const book = ePub(epubUrl);
    bookRef.current = book;
    const r = book.renderTo(viewerRef.current, { width: "100%", height: "100%", spread: "none" });
    renditionRef.current = r;
    applyTheme(r, fontSize, theme);
    r.display();
    book.ready.then(() => {
      setLoading(false);
      book.navigation.then(nav => setToc(nav.toc || []));
      book.locations.generate(1600).then(() => {});
    }).catch(e => { setError(e.message); setLoading(false); });
    r.on("relocated", loc => {
      setProgress(book.locations.percentageFromCfi(loc.start.cfi) * 100 || 0);
    });
    return () => book.destroy();
  }, [epubUrl]);

  useEffect(() => {
    if (renditionRef.current) applyTheme(renditionRef.current, fontSize, theme);
  }, [fontSize, theme, applyTheme]);

  useEffect(() => {
    const handler = e => {
      if (e.key === "ArrowLeft") renditionRef.current?.prev();
      if (e.key === "ArrowRight") renditionRef.current?.next();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", flexDirection: "column",
      background: THEMES[theme].bg, color: THEMES[theme].color }}>
      {/* 툴바 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px",
        background: "rgba(0,0,0,0.25)", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
        <button onClick={onClose} style={rdrBtn}><X size={18}/></button>
        <span style={{ flex: 1, textAlign: "center", fontWeight: 600, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
        <button onClick={() => setShowToc(!showToc)} style={rdrBtn}><List size={18}/></button>
        <button onClick={() => setFontSize(f => Math.max(14, f-2))} style={rdrBtn}><ZoomOut size={16}/></button>
        <span style={{ fontSize: "0.8rem", minWidth: 32, textAlign: "center" }}>{fontSize}</span>
        <button onClick={() => setFontSize(f => Math.min(28, f+2))} style={rdrBtn}><ZoomIn size={16}/></button>
        {Object.entries(THEMES).map(([k, t]) => (
          <button key={k} onClick={() => setTheme(k)} style={{
            ...rdrBtn, background: t.bg, color: t.color,
            border: theme === k ? "2px solid #6366f1" : "1px solid #555",
            fontSize: "0.72rem", padding: "4px 8px",
          }}>{t.name}</button>
        ))}
      </div>

      {/* 목차 */}
      {showToc && toc.length > 0 && (
        <div style={{ position: "absolute", top: 50, right: 0, width: 260, background: "#1e1b4b",
          border: "1px solid rgba(99,102,241,0.3)", borderRadius: "0 0 0 14px",
          padding: 16, zIndex: 10, maxHeight: "60vh", overflowY: "auto" }}>
          <p style={{ color: "#a5b4fc", fontSize: "0.85rem", marginBottom: 10, fontWeight: 600 }}>목차</p>
          {toc.map((item, i) => (
            <button key={i} onClick={() => { renditionRef.current?.display(item.href); setShowToc(false); }}
              style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none",
                color: THEMES[theme].color, padding: "7px 8px", cursor: "pointer", fontSize: "0.88rem",
                borderRadius: 6, transition: "background 0.15s" }}
              onMouseOver={e => e.currentTarget.style.background = "rgba(99,102,241,0.2)"}
              onMouseOut={e => e.currentTarget.style.background = "none"}>{item.label?.trim()}</button>
          ))}
        </div>
      )}

      {/* 뷰어 */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <button onClick={() => renditionRef.current?.prev()} style={navBtn}><ChevronLeft size={28}/></button>
        <div style={{ flex: 1, position: "relative" }}>
          {loading && <div style={centerFlex}><div className="spinner"/><p style={{ marginTop: 12, color: "#9ca3af" }}>책을 불러오는 중...</p></div>}
          {error && <div style={centerFlex}><BookOpen size={40} style={{ color: "#6b7280" }}/><p style={{ color: "#ef4444", marginTop: 12 }}>{error}</p></div>}
          <div ref={viewerRef} style={{ width: "100%", height: "100%" }}/>
        </div>
        <button onClick={() => renditionRef.current?.next()} style={navBtn}><ChevronRight size={28}/></button>
      </div>

      {/* 진행바 */}
      <div style={{ padding: "6px 20px 8px", background: "rgba(0,0,0,0.2)", flexShrink: 0 }}>
        <div style={{ height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden", marginBottom: 4 }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", transition: "width 0.3s" }}/>
        </div>
        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#6b7280" }}>{progress.toFixed(1)}% 완료</p>
      </div>
    </div>
  );
}

const rdrBtn = {
  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 8, color: "inherit", padding: "6px 8px", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};
const navBtn = {
  background: "rgba(255,255,255,0.05)", border: "none", color: "inherit",
  padding: "16px 10px", cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0,
};
const centerFlex = {
  position: "absolute", inset: 0, display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center", zIndex: 5,
};

// ─────────────────────────────────────────────────────────────
// 즉시 변환 위젯 (문서 → EPUB, 홈에서 바로 사용)
// ─────────────────────────────────────────────────────────────
function QuickConvert({ onEpubReady }) {
  const { account, contracts, connectWallet } = useWeb3();
  const [step, setStep] = useState(0); // 0: 업로드, 1: 정보 입력, 2: 완료
  const [docFile, setDocFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [uploadedDoc, setUploadedDoc] = useState(null);
  const [uploadedCover, setUploadedCover] = useState(null);
  const [preview, setPreview] = useState(null);
  const [epubResult, setEpubResult] = useState(null);
  const [ipfsResult, setIpfsResult] = useState(null);
  const [mintedId, setMintedId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState({
    title: "", author: "", genre: "소설", description: "",
    language: "ko", royaltyPercent: 1000, isLimitedEdition: false, totalEditions: 100,
  });

  const onDocDrop = useCallback(async (files) => {
    const file = files[0];
    if (!file) return;
    setDocFile(file);
    const tid = toast.loading("업로드 중...");
    try {
      const fd = new FormData();
      fd.append("document", file);
      const res = await axios.post("/api/upload/document", fd);
      setUploadedDoc(res.data.file);
      toast.success("업로드 완료!", { id: tid });
      // 자동 미리보기
      const pres = await axios.post("/api/ebook/preview", { filePath: res.data.file.path, mimeType: res.data.file.mimetype });
      setPreview(pres.data);
      // 파일명에서 제목 자동 추출
      const auto = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
      setForm(f => ({ ...f, title: f.title || auto }));
      setStep(1);
    } catch (e) {
      toast.error(e.response?.data?.error || e.message, { id: tid });
    }
  }, []);

  const onCoverDrop = useCallback(async (files) => {
    const file = files[0];
    if (!file) return;
    setCoverFile(file);
    const fd = new FormData();
    fd.append("cover", file);
    try {
      const res = await axios.post("/api/upload/cover", fd);
      setUploadedCover(res.data.cover);
      toast.success("표지 업로드 완료!");
    } catch { toast.error("표지 업로드 실패"); }
  }, []);

  const { getRootProps: docRP, getInputProps: docIP, isDragActive: docDrag } = useDropzone({
    onDrop: onDocDrop,
    accept: { "text/plain": [".txt"], "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/markdown": [".md"] },
    maxFiles: 1,
  });

  const { getRootProps: covRP, getInputProps: covIP } = useDropzone({
    onDrop: onCoverDrop, accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] }, maxFiles: 1,
  });

  const generateEpub = async () => {
    if (!form.title || !form.author) return toast.error("제목과 저자명을 입력하세요.");
    setProcessing(true);
    const tid = toast.loading("EPUB 생성 중...");
    try {
      const res = await axios.post("/api/ebook/generate", {
        filePath: uploadedDoc.path, mimeType: uploadedDoc.mimetype,
        coverImagePath: uploadedCover?.path || null, ...form,
      });
      setEpubResult(res.data.epub);
      toast.success(`EPUB 완성! (${res.data.epub.chapters}챕터)`, { id: tid });
      setStep(2);
      onEpubReady?.(res.data.epub);
    } catch (e) {
      toast.error(e.response?.data?.error || e.message, { id: tid });
    } finally { setProcessing(false); }
  };

  const uploadAndMint = async () => {
    if (!account) return toast.error("지갑을 먼저 연결하세요.");
    setProcessing(true);
    const tid = toast.loading("IPFS 업로드 중...");
    try {
      const epubRes = await axios.post("/api/ipfs/upload-epub", {
        filename: epubResult.filename, title: form.title, author: form.author,
      });
      const metaRes = await axios.post("/api/ipfs/upload-metadata", {
        metadata: { ...form, epubIpfsHash: epubRes.data.ipfsHash, publisher: `${form.author} 독립출판` },
      });
      setIpfsResult({ epub: epubRes.data, meta: metaRes.data });
      toast.success("IPFS 완료!", { id: tid });

      if (!contracts.nft) {
        toast("NFT 발행: 컨트랙트 미연결 (데모 모드)", { icon: "⚠️" });
        setMintedId("DEMO");
        return;
      }
      toast.loading("NFT 민팅 중... MetaMask 승인 필요", { id: tid });
      const ebookMeta = {
        title: form.title, author: form.author, genre: form.genre,
        description: form.description, epubIpfsHash: epubRes.data.ipfsHash,
        coverIpfsHash: "", publishedAt: 0n,
        totalEditions: BigInt(form.isLimitedEdition ? form.totalEditions : 0),
        mintedCount: 0n, isLimitedEdition: form.isLimitedEdition,
      };
      const tx = await contracts.nft.mintEbook(account, metaRes.data.metadataUrl, ebookMeta, form.royaltyPercent);
      const receipt = await tx.wait();
      const ev = receipt.logs.find(l => { try { return contracts.nft.interface.parseLog(l)?.name === "EbookMinted"; } catch { return false; } });
      const tokenId = ev ? contracts.nft.interface.parseLog(ev).args.tokenId : "?";
      setMintedId(tokenId.toString());
      toast.success(`NFT 발행 완료! Token #${tokenId}`, { id: tid });
    } catch (e) {
      toast.error(e.code === 4001 ? "거래 취소됨" : e.message, { id: tid });
    } finally { setProcessing(false); }
  };

  const reset = () => {
    setStep(0); setDocFile(null); setCoverFile(null); setUploadedDoc(null);
    setUploadedCover(null); setPreview(null); setEpubResult(null);
    setIpfsResult(null); setMintedId(null); setProcessing(false);
    setForm({ title: "", author: "", genre: "소설", description: "", language: "ko", royaltyPercent: 1000, isLimitedEdition: false, totalEditions: 100 });
  };

  return (
    <div className="qc-wrap">
      {/* 단계 헤더 */}
      <div className="qc-steps">
        {["문서 업로드", "정보 입력", "완료"].map((s, i) => (
          <div key={s} className={`qc-step ${i <= step ? "qc-active" : ""} ${i < step ? "qc-done" : ""}`}>
            <div className="qc-dot">{i < step ? <Check size={12}/> : i + 1}</div>
            <span>{s}</span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 0: 파일 드롭 */}
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div {...docRP()} className={`qc-drop ${docDrag ? "qc-drag" : ""}`}>
              <input {...docIP()}/>
              <Upload size={36} className="qc-drop-icon"/>
              <p className="qc-drop-text">창작 문서를 드래그하거나 클릭해서 선택</p>
              <p className="qc-drop-hint">TXT · DOCX · PDF · MD (최대 50MB)</p>
            </div>
          </motion.div>
        )}

        {/* STEP 1: 정보 입력 */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="qc-file-info">
              <FileText size={16}/> {docFile?.name}
              {preview && <span className="qc-preview-badge">약 {preview.estimatedPages}페이지</span>}
            </div>

            {preview && (
              <div className="qc-preview-text">
                <p>{preview.preview}</p>
              </div>
            )}

            <div className="qc-form-row">
              <div className="form-group">
                <label className="form-label">제목 *</label>
                <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="작품 제목"/>
              </div>
              <div className="form-group">
                <label className="form-label">저자명 *</label>
                <input className="form-input" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="이름 또는 필명"/>
              </div>
            </div>

            <div className="qc-form-row">
              <div className="form-group">
                <label className="form-label">장르</label>
                <select className="form-input" value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}>
                  {GENRES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">표지 이미지 (선택)</label>
                <div {...covRP()} className="qc-cover-drop">
                  <input {...covIP()}/>
                  {coverFile
                    ? <span style={{ color: "#10b981" }}><Check size={14}/> 업로드됨</span>
                    : <span><Image size={14}/> 이미지 선택</span>}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">작품 소개</label>
              <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="독자에게 작품을 소개하세요..."/>
            </div>

            <div className="qc-royalty">
              <span className="form-label">NFT 로열티</span>
              <div style={{ display: "flex", gap: 8 }}>
                {[500, 800, 1000, 1500].map(v => (
                  <button key={v} className={`qc-royalty-btn ${form.royaltyPercent === v ? "active" : ""}`}
                    onClick={() => setForm(f => ({ ...f, royaltyPercent: v }))}>{v/100}%</button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setStep(0)}>← 이전</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}
                onClick={generateEpub} disabled={processing}>
                {processing ? <><Loader size={16} className="spin"/> 생성 중...</> : <><Zap size={16}/> EPUB 생성</>}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: 완료 */}
        {step === 2 && epubResult && (
          <motion.div key="s2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {mintedId ? (
              <div className="qc-mint-success">
                <div style={{ fontSize: "2.5rem" }}>🎉</div>
                <h3>NFT 발행 완료!</h3>
                <p>Token #{mintedId} — <strong>{form.title}</strong></p>
                <p style={{ color: "#a5b4fc", fontSize: "0.85rem" }}>블록체인에 저작권이 영구 등록되었습니다</p>
                <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={reset}><RefreshCw size={14}/> 새 작품 출판</button>
              </div>
            ) : (
              <>
                <div className="qc-result-box">
                  <div className="qc-result-icon"><Check size={28}/></div>
                  <div>
                    <p className="qc-result-title">{form.title}</p>
                    <p className="qc-result-meta">{epubResult.chapters}챕터 · {(epubResult.fileSize / 1024).toFixed(1)}KB</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <a href={epubResult.downloadUrl} download={`${form.title || "ebook"}.epub`}
                    className="btn btn-secondary" style={{ flex: 1, justifyContent: "center" }}>
                    <Download size={15}/> EPUB 다운로드
                  </a>
                  <button className="btn btn-secondary" style={{ flex: 1, justifyContent: "center" }}
                    onClick={async () => {
                      try {
                        // blob URL로 변환하여 epub.js에 전달 (CORS 우회)
                        const res = await fetch(epubResult.downloadUrl);
                        const blob = await res.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        window.dispatchEvent(new CustomEvent("openReader", { detail: { url: blobUrl, title: form.title } }));
                      } catch {
                        window.dispatchEvent(new CustomEvent("openReader", { detail: { url: epubResult.downloadUrl, title: form.title } }));
                      }
                    }}>
                    <Eye size={15}/> 미리 읽기
                  </button>
                </div>

                {ipfsResult && (
                  <div className="qc-ipfs-info">
                    <p>IPFS: <code>{ipfsResult.epub.ipfsHash?.slice(0, 24)}...</code>
                    {ipfsResult.epub.isDemoMode && <span className="qc-demo-tag">Demo</span>}</p>
                  </div>
                )}

                <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}
                  onClick={account ? uploadAndMint : connectWallet} disabled={processing || !!mintedId}>
                  {processing
                    ? <><Loader size={16} className="spin"/> 처리 중...</>
                    : account
                    ? <><Zap size={16}/> IPFS 저장 + NFT 발행 (선택)</>
                    : <><Wallet size={16}/> 지갑 연결 후 NFT 발행</>}
                </button>

                <button className="qc-reset-btn" onClick={reset}><RefreshCw size={13}/> 다른 작품 출판</button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .qc-wrap { padding: 4px 0; }
        .qc-steps { display: flex; gap: 0; margin-bottom: 20px; }
        .qc-step {
          display: flex; align-items: center; gap: 8px;
          flex: 1; font-size: 0.82rem; color: #6b7280;
          position: relative;
        }
        .qc-step::after {
          content: ''; position: absolute; right: 0; top: 50%;
          width: calc(100% - 80px); height: 1px; background: rgba(99,102,241,0.2);
        }
        .qc-step:last-child::after { display: none; }
        .qc-dot {
          width: 24px; height: 24px; border-radius: 50%;
          background: rgba(99,102,241,0.1); border: 1.5px solid rgba(99,102,241,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 700; flex-shrink: 0;
          transition: all 0.2s;
        }
        .qc-active { color: #a5b4fc; }
        .qc-active .qc-dot { background: rgba(99,102,241,0.25); border-color: #6366f1; }
        .qc-done .qc-dot { background: #6366f1; border-color: #6366f1; color: white; }

        .qc-drop {
          border: 2px dashed rgba(99,102,241,0.35); border-radius: 14px;
          padding: 36px 20px; text-align: center; cursor: pointer;
          transition: all 0.2s; background: rgba(99,102,241,0.04);
          display: flex; flex-direction: column; align-items: center; gap: 10px;
        }
        .qc-drop:hover, .qc-drag { border-color: #6366f1; background: rgba(99,102,241,0.1); }
        .qc-drop-icon { color: rgba(99,102,241,0.45); }
        .qc-drop-text { font-size: 0.95rem; color: #e0e7ff; }
        .qc-drop-hint { font-size: 0.8rem; color: #6b7280; }

        .qc-file-info {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.85rem; color: #a5b4fc; margin-bottom: 10px;
          padding: 8px 12px; background: rgba(99,102,241,0.08); border-radius: 8px;
        }
        .qc-preview-badge {
          margin-left: auto; font-size: 0.75rem; color: #10b981;
          background: rgba(16,185,129,0.1); padding: 2px 8px; border-radius: 999px;
        }
        .qc-preview-text {
          background: rgba(0,0,0,0.2); border-radius: 10px; padding: 12px;
          font-size: 0.82rem; color: #9ca3af; line-height: 1.7;
          max-height: 80px; overflow: hidden; margin-bottom: 14px;
          position: relative;
        }
        .qc-preview-text::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0;
          height: 24px; background: linear-gradient(transparent, rgba(0,0,0,0.2));
        }
        .qc-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .qc-cover-drop {
          padding: 10px 14px; border: 1.5px dashed rgba(99,102,241,0.3);
          border-radius: 10px; cursor: pointer; display: flex;
          align-items: center; gap: 8px; font-size: 0.85rem; color: #a5b4fc;
          height: 44px; transition: border-color 0.2s;
        }
        .qc-cover-drop:hover { border-color: #6366f1; }
        .qc-royalty {
          display: flex; align-items: center; gap: 12px; margin-top: 4px;
          flex-wrap: wrap;
        }
        .qc-royalty-btn {
          padding: 6px 14px; border-radius: 8px;
          background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.25);
          color: #a5b4fc; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;
        }
        .qc-royalty-btn.active {
          background: rgba(99,102,241,0.3); border-color: #6366f1; color: white;
        }
        .qc-result-box {
          display: flex; align-items: center; gap: 14px;
          padding: 14px; background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.25); border-radius: 12px; margin-bottom: 14px;
        }
        .qc-result-icon {
          width: 48px; height: 48px; border-radius: 12px;
          background: rgba(16,185,129,0.15); color: #10b981;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .qc-result-title { font-weight: 700; color: #e0e7ff; margin-bottom: 2px; }
        .qc-result-meta { font-size: 0.82rem; color: #9ca3af; }
        .qc-ipfs-info {
          padding: 8px 12px; background: rgba(99,102,241,0.08);
          border-radius: 8px; font-size: 0.8rem; color: #9ca3af; margin-bottom: 10px;
        }
        .qc-ipfs-info code { color: #a5b4fc; }
        .qc-demo-tag {
          margin-left: 8px; font-size: 0.7rem; background: rgba(245,158,11,0.2);
          color: #fbbf24; padding: 1px 6px; border-radius: 4px;
        }
        .qc-mint-success {
          text-align: center; padding: 24px 16px;
          background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25);
          border-radius: 14px;
        }
        .qc-mint-success h3 { color: #10b981; font-size: 1.3rem; margin: 8px 0 4px; }
        .qc-mint-success p { color: #e0e7ff; margin-bottom: 4px; }
        .qc-reset-btn {
          display: flex; align-items: center; gap: 6px; justify-content: center;
          width: 100%; margin-top: 10px; background: none; border: none;
          color: #6b7280; cursor: pointer; font-size: 0.82rem; padding: 6px;
        }
        .qc-reset-btn:hover { color: #a5b4fc; }
        @media (max-width: 600px) { .qc-form-row { grid-template-columns: 1fr; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 마켓 미리보기 카드
// ─────────────────────────────────────────────────────────────
function MarketCard({ book, onRead, onBuy, onBid }) {
  const priceEth = book.isAuction
    ? ethers.formatEther(book.currentBid || book.startPrice || 0n)
    : ethers.formatEther(book.price || 0n);

  const remaining = book.endTime
    ? (() => {
        const diff = Number(book.endTime) - Math.floor(Date.now() / 1000);
        if (diff <= 0) return "종료";
        const h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}분`;
      })()
    : null;

  const colors = ["#4f46e5","#7c3aed","#db2777","#0891b2","#059669","#d97706"];
  const bg = colors[book.id % colors.length];

  return (
    <div className="mc-card">
      <div className="mc-cover" style={{ background: `linear-gradient(135deg, ${bg}33, ${bg}88)` }}>
        <BookOpen size={32} style={{ color: bg, opacity: 0.6 }}/>
        <span className="mc-genre-tag">{book.genre}</span>
        {book.isAuction && <span className="mc-auction-tag"><Gavel size={10}/> 경매</span>}
        {!book.isAuction && <span className="mc-nft-tag">NFT</span>}
      </div>
      <div className="mc-body">
        <h3 className="mc-title">{book.title}</h3>
        <p className="mc-author"><User size={11}/> {book.author}</p>
        <p className="mc-desc">{book.description}</p>

        <div className="mc-price-row">
          <div>
            <div className="mc-price-label">{book.isAuction ? (book.currentBid > 0n ? "현재 입찰" : "시작가") : "판매가"}</div>
            <div className="mc-price">{priceEth} ETH</div>
          </div>
          {remaining && (
            <div className="mc-timer"><Clock size={12}/> {remaining}</div>
          )}
        </div>

        {book.isLimitedEdition && (
          <div className="mc-edition">{book.mintedCount}/{book.totalEditions} 한정판</div>
        )}

        <div className="mc-actions">
          <button className="mc-btn mc-btn-read" onClick={() => onRead(book)}><Eye size={13}/> 읽기</button>
          <button className="mc-btn mc-btn-buy" onClick={() => book.isAuction ? onBid(book) : onBuy(book)}>
            {book.isAuction ? <><Gavel size={13}/> 입찰</> : <><Tag size={13}/> 구매</>}
          </button>
        </div>
      </div>

      <style>{`
        .mc-card {
          background: #1e1b4b; border: 1px solid rgba(99,102,241,0.2);
          border-radius: 14px; overflow: hidden; transition: all 0.25s;
          display: flex; flex-direction: column;
        }
        .mc-card:hover { transform: translateY(-3px); border-color: rgba(99,102,241,0.5); box-shadow: 0 8px 32px rgba(99,102,241,0.15); }
        .mc-cover {
          height: 130px; display: flex; align-items: center; justify-content: center;
          position: relative;
        }
        .mc-genre-tag {
          position: absolute; bottom: 8px; left: 8px; font-size: 0.72rem;
          background: rgba(0,0,0,0.5); color: #e0e7ff; padding: 2px 8px; border-radius: 6px;
        }
        .mc-nft-tag {
          position: absolute; top: 8px; right: 8px; font-size: 0.68rem; font-weight: 700;
          background: linear-gradient(135deg,#6366f1,#8b5cf6); color: white;
          padding: 2px 7px; border-radius: 5px;
        }
        .mc-auction-tag {
          position: absolute; top: 8px; right: 8px; font-size: 0.68rem; font-weight: 700;
          background: rgba(245,158,11,0.85); color: #1a1a1a;
          padding: 2px 7px; border-radius: 5px; display: flex; align-items: center; gap: 3px;
        }
        .mc-body { padding: 14px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .mc-title { font-size: 0.95rem; font-weight: 700; color: #e0e7ff; font-family: var(--font-serif); }
        .mc-author { display: flex; align-items: center; gap: 4px; font-size: 0.78rem; color: #a5b4fc; }
        .mc-desc { font-size: 0.78rem; color: #9ca3af; line-height: 1.5; flex: 1;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .mc-price-row { display: flex; align-items: flex-end; justify-content: space-between; margin-top: 4px; }
        .mc-price-label { font-size: 0.7rem; color: #9ca3af; }
        .mc-price { font-size: 1rem; font-weight: 700; color: #e0e7ff; }
        .mc-timer { display: flex; align-items: center; gap: 4px; font-size: 0.75rem; color: #f59e0b; }
        .mc-edition { font-size: 0.72rem; color: #f59e0b; }
        .mc-actions { display: flex; gap: 6px; margin-top: 8px; }
        .mc-btn {
          flex: 1; padding: 7px 0; border-radius: 8px; border: none;
          cursor: pointer; font-size: 0.8rem; display: flex; align-items: center;
          justify-content: center; gap: 4px; transition: all 0.15s;
        }
        .mc-btn-read { background: rgba(99,102,241,0.1); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.25); }
        .mc-btn-read:hover { background: rgba(99,102,241,0.2); }
        .mc-btn-buy { background: linear-gradient(135deg,#6366f1,#8b5cf6); color: white; }
        .mc-btn-buy:hover { opacity: 0.9; }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 마켓 섹션 (홈에서 직접 구매/입찰)
// ─────────────────────────────────────────────────────────────
function HomeMarket() {
  const { account, contracts, connectWallet } = useWeb3();
  const [books, setBooks] = useState(DEMO_BOOKS);
  const [reader, setReader] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bidModal, setBidModal] = useState(null);
  const [bidAmount, setBidAmount] = useState("");
  const [filter, setFilter] = useState("전체");

  const loadFromChain = useCallback(async () => {
    if (!contracts.marketplace) return;
    setLoading(true);
    try {
      const [rawL, rawA] = await Promise.all([
        contracts.marketplace.getActiveListing(),
        contracts.marketplace.getActiveAuctions(),
      ]);
      const enrich = async (items, isAuction) => Promise.all(items.map(async (it, i) => {
        try { const m = await contracts.nft.getEbookData(it.tokenId); return { ...it, ...m, id: i, isAuction }; }
        catch { return { ...it, id: i, isAuction }; }
      }));
      const all = [...await enrich(rawL, false), ...await enrich(rawA, true)];
      if (all.length > 0) setBooks(all);
    } catch (e) {
      console.error("마켓 로드 실패:", e);
    } finally { setLoading(false); }
  }, [contracts]);

  useEffect(() => { loadFromChain(); }, [loadFromChain]);

  const handleBuy = async (book) => {
    if (!account) return toast.error("지갑을 연결하세요.");
    if (!contracts.marketplace) return toast("데모 모드: 실제 구매는 컨트랙트 연결 후 가능합니다.", { icon: "⚠️" });
    const tid = toast.loading("구매 처리 중...");
    try {
      const tx = await contracts.marketplace.buyNow(book.id, { value: book.price });
      await tx.wait();
      toast.success("구매 완료!", { id: tid });
      loadFromChain();
    } catch (e) { toast.error(e.code === 4001 ? "취소됨" : e.message, { id: tid }); }
  };

  const handleBid = async () => {
    if (!account) return toast.error("지갑을 연결하세요.");
    if (!bidAmount) return toast.error("입찰 금액을 입력하세요.");
    if (!contracts.marketplace) { toast("데모 모드", { icon: "⚠️" }); setBidModal(null); return; }
    const tid = toast.loading("입찰 중...");
    try {
      const tx = await contracts.marketplace.placeBid(bidModal.id, { value: ethers.parseEther(bidAmount) });
      await tx.wait();
      toast.success("입찰 완료!", { id: tid });
      setBidModal(null); setBidAmount(""); loadFromChain();
    } catch (e) { toast.error(e.message, { id: tid }); }
  };

  const genres = ["전체", ...new Set(books.map(b => b.genre).filter(Boolean))];
  const filtered = filter === "전체" ? books : books.filter(b => b.genre === filter);

  return (
    <div>
      {reader && <EbookReaderModal epubUrl={reader.url} title={reader.title} onClose={() => setReader(null)}/>}

      {/* 입찰 모달 */}
      {bidModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-card" style={{ padding: 28, maxWidth: 360, width: "90%" }}>
            <h3 style={{ marginBottom: 16 }}>입찰: {bidModal.title}</h3>
            <p style={{ color: "#9ca3af", fontSize: "0.85rem", marginBottom: 16 }}>
              현재 {ethers.formatEther(bidModal.currentBid || bidModal.startPrice || 0n)} ETH
            </p>
            <input className="form-input" type="number" step="0.001" placeholder="입찰 금액 (ETH)"
              value={bidAmount} onChange={e => setBidAmount(e.target.value)} style={{ marginBottom: 14 }}/>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setBidModal(null)}>취소</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleBid}><Gavel size={14}/> 입찰</button>
            </div>
          </div>
        </div>
      )}

      {/* 장르 필터 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        {genres.map(g => (
          <button key={g} onClick={() => setFilter(g)} style={{
            padding: "5px 14px", borderRadius: 999, fontSize: "0.82rem", cursor: "pointer",
            background: filter === g ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.06)",
            border: filter === g ? "1px solid #6366f1" : "1px solid rgba(99,102,241,0.2)",
            color: filter === g ? "#a5b4fc" : "#9ca3af", transition: "all 0.15s",
          }}>{g}</button>
        ))}
        <button onClick={loadFromChain} style={{ marginLeft: "auto", background: "none", border: "none",
          color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: "0.82rem" }}>
          <RefreshCw size={13} className={loading ? "spin" : ""}/> 새로고침
        </button>
      </div>

      <div className="market-grid">
        {filtered.map((book, i) => (
          <motion.div key={book.id ?? i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <MarketCard
              book={book}
              onRead={b => b.epubUrl ? setReader({ url: b.epubUrl, title: b.title }) : toast("데모: IPFS epub 연결 후 읽기 가능", { icon: "📖" })}
              onBuy={handleBuy}
              onBid={b => { setBidModal(b); setBidAmount(""); }}
            />
          </motion.div>
        ))}
      </div>

      {!account && (
        <div style={{ textAlign: "center", marginTop: 20, padding: "14px", background: "rgba(99,102,241,0.06)", borderRadius: 12 }}>
          <p style={{ color: "#9ca3af", fontSize: "0.88rem", marginBottom: 10 }}>구매 및 입찰하려면 지갑 연결이 필요합니다</p>
          <button className="btn btn-primary" onClick={connectWallet} style={{ fontSize: "0.9rem" }}><Wallet size={14}/> MetaMask 연결</button>
        </div>
      )}

      <style>{`
        .market-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
        @media (max-width: 640px) { .market-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 내 서재 (홈에서 바로 확인)
// ─────────────────────────────────────────────────────────────
function HomeLibrary() {
  const { account, contracts, connectWallet } = useWeb3();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reader, setReader] = useState(null);
  const [pending, setPending] = useState("0");

  useEffect(() => {
    if (!account || !contracts.nft) return;
    setLoading(true);
    (async () => {
      try {
        const ids = await contracts.nft.getAuthorBooks(account);
        const items = await Promise.all(ids.map(async id => {
          const m = await contracts.nft.getEbookData(id);
          return { tokenId: id, ...m };
        }));
        setBooks(items);
        if (contracts.marketplace) {
          const p = await contracts.marketplace.pendingWithdrawals(account);
          setPending(ethers.formatEther(p));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [account, contracts]);

  if (!account) return (
    <div style={{ textAlign: "center", padding: "40px 20px" }}>
      <Library size={48} style={{ color: "rgba(99,102,241,0.3)", marginBottom: 16 }}/>
      <p style={{ color: "#9ca3af", marginBottom: 14 }}>지갑을 연결하면 내 작품을 확인할 수 있습니다</p>
      <button className="btn btn-primary" onClick={connectWallet}><Wallet size={15}/> 지갑 연결</button>
    </div>
  );

  if (loading) return <div style={{ textAlign: "center", padding: 40 }}><div className="spinner"/></div>;

  if (books.length === 0) return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
      <BookOpen size={40} style={{ color: "rgba(99,102,241,0.3)", marginBottom: 12 }}/>
      <p style={{ marginBottom: 8 }}>아직 출판한 작품이 없습니다</p>
      <p style={{ fontSize: "0.85rem" }}>왼쪽 "즉시 변환" 탭에서 첫 작품을 출판해보세요!</p>
    </div>
  );

  return (
    <div>
      {reader && <EbookReaderModal epubUrl={reader.url} title={reader.title} onClose={() => setReader(null)}/>}

      {parseFloat(pending) > 0 && (
        <div style={{ padding: "10px 16px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
          borderRadius: 10, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#fbbf24", fontSize: "0.88rem" }}>💰 인출 가능: {pending} ETH</span>
          <button className="btn btn-secondary" style={{ padding: "6px 14px", fontSize: "0.82rem" }}
            onClick={async () => { await contracts.marketplace.withdraw(); setPending("0"); toast.success("인출 완료!"); }}>
            인출
          </button>
        </div>
      )}

      <div className="market-grid">
        {books.map((book, i) => (
          <motion.div key={book.tokenId?.toString()} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <div className="mc-card" style={{ cursor: "default" }}>
              <div className="mc-cover" style={{ background: `linear-gradient(135deg, #4f46e533, #7c3aed88)` }}>
                <BookOpen size={28} style={{ color: "#7c3aed", opacity: 0.7 }}/>
                <span className="mc-genre-tag">{book.genre}</span>
                <span className="mc-nft-tag">#{book.tokenId?.toString()}</span>
              </div>
              <div className="mc-body">
                <h3 className="mc-title">{book.title}</h3>
                <p className="mc-author"><User size={11}/> {book.author}</p>
                {book.isLimitedEdition && <p style={{ fontSize: "0.75rem", color: "#f59e0b" }}>한정판 {book.mintedCount?.toString()}/{book.totalEditions?.toString()}</p>}
                <div className="mc-actions" style={{ marginTop: "auto" }}>
                  <button className="mc-btn mc-btn-read"
                    onClick={() => book.epubIpfsHash ? setReader({ url: `https://gateway.pinata.cloud/ipfs/${book.epubIpfsHash}`, title: book.title }) : toast("epub URL 없음")}>
                    <Eye size={13}/> 읽기
                  </button>
                  <button className="mc-btn mc-btn-buy" style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc" }}>
                    <Tag size={13}/> 판매등록
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <style>{`
        .market-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
        @media (max-width: 640px) { .market-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 홈 메인
// ─────────────────────────────────────────────────────────────
const TABS = [
  { id: "publish", label: "즉시 변환", icon: <Upload size={15}/>, desc: "문서 → EPUB → NFT" },
  { id: "market",  label: "거래소",   icon: <Globe size={15}/>,  desc: "작품 구매 & 경매"  },
  { id: "library", label: "내 서재",  icon: <Library size={15}/>, desc: "내 NFT 작품"      },
];

export default function Home() {
  const { account, connectWallet, isConnecting } = useWeb3();
  const [activeTab, setActiveTab] = useState("publish");
  const [reader, setReader] = useState(null);

  // QuickConvert에서 발행한 epub을 리더로 열기
  useEffect(() => {
    const handler = e => setReader(e.detail);
    window.addEventListener("openReader", handler);
    return () => window.removeEventListener("openReader", handler);
  }, []);

  return (
    <div className="home-v2">
      {reader && <EbookReaderModal epubUrl={reader.url} title={reader.title} onClose={() => setReader(null)}/>}

      {/* ── 히어로 (컴팩트) ── */}
      <section className="hv2-hero">
        <div className="container hv2-hero-inner">
          <motion.div className="hv2-hero-text"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="hv2-badge"><Sparkles size={13}/> 블록체인 1인 독립출판 플랫폼</div>
            <h1 className="hv2-title">창작물을 <span className="gradient-text">영원히 기록</span>하세요</h1>
            <p className="hv2-sub">문서 → EPUB 자동 변환 · NFT 저작권 등록 · 탈중앙 거래소</p>
          </motion.div>

          <motion.div className="hv2-hero-stats"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            {[
              { v: "5종", l: "지원 형식" },
              { v: "EIP-2981", l: "자동 로열티" },
              { v: "IPFS", l: "영구 보관" },
              { v: "ERC-721", l: "NFT 표준" },
            ].map(s => (
              <div key={s.v} className="hv2-stat">
                <span className="hv2-stat-v">{s.v}</span>
                <span className="hv2-stat-l">{s.l}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── 메인 기능 허브 ── */}
      <section className="container hv2-hub">
        {/* 탭 네비게이션 */}
        <div className="hv2-tabs">
          {TABS.map(tab => (
            <button key={tab.id} className={`hv2-tab ${activeTab === tab.id ? "hv2-tab-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}>
              {tab.icon}
              <span className="hv2-tab-label">{tab.label}</span>
              <span className="hv2-tab-desc">{tab.desc}</span>
            </button>
          ))}
          {/* 지갑 연결 상태 */}
          {!account && (
            <button className="hv2-wallet-btn" onClick={connectWallet} disabled={isConnecting}>
              <Wallet size={14}/>
              {isConnecting ? "연결 중..." : "지갑 연결"}
            </button>
          )}
          {account && (
            <div className="hv2-wallet-info">
              <div className="hv2-wallet-dot"/>
              <span>{account.slice(0,6)}…{account.slice(-4)}</span>
            </div>
          )}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="hv2-content glass-card">
          <AnimatePresence mode="wait">
            {activeTab === "publish" && (
              <motion.div key="publish" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <div className="hv2-content-header">
                  <h2><Upload size={20}/> 즉시 변환 · 출판</h2>
                  <p>창작 문서를 업로드하면 EPUB으로 자동 변환됩니다. NFT 등록은 선택 사항입니다.</p>
                </div>
                <QuickConvert onEpubReady={() => {}}/>
              </motion.div>
            )}
            {activeTab === "market" && (
              <motion.div key="market" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <div className="hv2-content-header">
                  <h2><Globe size={20}/> NFT 저작권 거래소</h2>
                  <p>블록체인으로 보증된 ebook 저작권 NFT를 구매하거나 경매에 참여하세요.</p>
                </div>
                <HomeMarket/>
              </motion.div>
            )}
            {activeTab === "library" && (
              <motion.div key="library" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <div className="hv2-content-header">
                  <h2><Library size={20}/> 내 서재</h2>
                  <p>내가 발행한 NFT 작품을 확인하고 관리합니다.</p>
                </div>
                <HomeLibrary/>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── 작동 방식 (미니) ── */}
      <section className="container hv2-how">
        <h2 className="hv2-section-title">어떻게 작동하나요?</h2>
        <div className="hv2-flow">
          {[
            { icon: <Upload size={20}/>, t: "문서 업로드", d: "TXT·DOCX·PDF·MD", c: "#6366f1" },
            { icon: <Zap size={20}/>, t: "EPUB 자동 생성", d: "챕터 분리 · 목차 · 한국어 폰트", c: "#8b5cf6" },
            { icon: <Globe size={20}/>, t: "IPFS 영구 저장", d: "분산 저장소에 영구 보관", c: "#06b6d4" },
            { icon: <Sparkles size={20}/>, t: "NFT 발행", d: "ERC-721 · EIP-2981 로열티", c: "#10b981" },
            { icon: <TrendingUp size={20}/>, t: "거래 & 수익", d: "고정가 판매 · 경매 · 로열티", c: "#f59e0b" },
          ].map((s, i) => (
            <React.Fragment key={s.t}>
              <motion.div className="hv2-flow-step"
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <div className="hv2-flow-icon" style={{ color: s.c, background: `${s.c}18` }}>{s.icon}</div>
                <p className="hv2-flow-title">{s.t}</p>
                <p className="hv2-flow-desc">{s.d}</p>
              </motion.div>
              {i < 4 && <div className="hv2-flow-arrow"><ChevronRight size={18}/></div>}
            </React.Fragment>
          ))}
        </div>
      </section>

      <style>{`
        .home-v2 { padding-bottom: 80px; }

        /* 히어로 */
        .hv2-hero {
          padding: 48px 0 32px;
          background: linear-gradient(180deg, rgba(99,102,241,0.06) 0%, transparent 100%);
          border-bottom: 1px solid rgba(99,102,241,0.1);
          margin-bottom: 40px;
        }
        .hv2-hero-inner { display: flex; flex-direction: column; gap: 24px; }
        .hv2-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.25);
          border-radius: 999px; padding: 4px 14px; font-size: 0.78rem; color: #a5b4fc;
          margin-bottom: 14px;
        }
        .hv2-title {
          font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 800;
          line-height: 1.2; font-family: var(--font-serif);
          color: #e0e7ff; margin-bottom: 10px;
        }
        .hv2-sub { font-size: 1rem; color: #9ca3af; }
        .hv2-hero-stats { display: flex; gap: 28px; flex-wrap: wrap; }
        .hv2-stat { display: flex; flex-direction: column; gap: 2px; }
        .hv2-stat-v { font-size: 0.95rem; font-weight: 700; color: #a5b4fc; }
        .hv2-stat-l { font-size: 0.72rem; color: #6b7280; }

        /* 허브 */
        .hv2-hub { margin-bottom: 60px; }
        .hv2-tabs {
          display: flex; gap: 6px; margin-bottom: 0;
          border-bottom: 1px solid rgba(99,102,241,0.15);
          padding-bottom: 0; flex-wrap: wrap; align-items: center;
        }
        .hv2-tab {
          display: flex; flex-direction: column; gap: 2px;
          padding: 12px 20px; background: none; border: none;
          color: #6b7280; cursor: pointer; font-size: 0.9rem;
          border-bottom: 2px solid transparent; margin-bottom: -1px;
          transition: all 0.2s; align-items: flex-start;
          border-top-left-radius: 10px; border-top-right-radius: 10px;
        }
        .hv2-tab:hover { background: rgba(99,102,241,0.06); color: #a5b4fc; }
        .hv2-tab-active { color: #e0e7ff !important; border-bottom-color: #6366f1 !important; background: rgba(99,102,241,0.1) !important; }
        .hv2-tab-label { font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; gap: 6px; }
        .hv2-tab-desc { font-size: 0.72rem; color: #6b7280; }
        .hv2-tab-active .hv2-tab-desc { color: #9ca3af; }
        .hv2-wallet-btn {
          margin-left: auto; display: flex; align-items: center; gap: 6px;
          padding: 8px 18px; background: linear-gradient(135deg,#6366f1,#8b5cf6);
          border: none; border-radius: 10px; color: white; cursor: pointer;
          font-size: 0.85rem; font-weight: 600; transition: opacity 0.2s;
        }
        .hv2-wallet-btn:hover { opacity: 0.9; }
        .hv2-wallet-info {
          margin-left: auto; display: flex; align-items: center; gap: 8px;
          padding: 8px 14px; background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.25); border-radius: 10px;
          font-size: 0.82rem; color: #34d399; font-family: monospace;
        }
        .hv2-wallet-dot { width: 7px; height: 7px; background: #10b981; border-radius: 50%; }

        /* 콘텐츠 패널 */
        .hv2-content {
          border-top-left-radius: 0; padding: 28px;
          min-height: 320px; border-top: none;
          border-color: rgba(99,102,241,0.15);
        }
        .hv2-content-header { margin-bottom: 20px; }
        .hv2-content-header h2 {
          display: flex; align-items: center; gap: 10px;
          font-size: 1.2rem; font-weight: 700; color: #e0e7ff; margin-bottom: 6px;
        }
        .hv2-content-header p { font-size: 0.88rem; color: #9ca3af; }

        /* 플로우 */
        .hv2-how { margin-bottom: 20px; }
        .hv2-section-title { font-size: 1.4rem; font-weight: 700; text-align: center; margin-bottom: 28px; font-family: var(--font-serif); }
        .hv2-flow { display: flex; align-items: flex-start; justify-content: center; gap: 4px; flex-wrap: wrap; }
        .hv2-flow-step { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; max-width: 130px; }
        .hv2-flow-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
        .hv2-flow-title { font-size: 0.82rem; font-weight: 600; color: #e0e7ff; }
        .hv2-flow-desc { font-size: 0.72rem; color: #9ca3af; line-height: 1.4; }
        .hv2-flow-arrow { color: rgba(99,102,241,0.4); margin-top: 14px; flex-shrink: 0; }

        @media (max-width: 768px) {
          .hv2-tabs { gap: 2px; }
          .hv2-tab { padding: 10px 12px; }
          .hv2-tab-desc { display: none; }
          .hv2-content { padding: 20px 16px; }
          .hv2-flow { gap: 8px; }
          .hv2-flow-arrow { display: none; }
          .hv2-hero-stats { gap: 16px; }
        }
      `}</style>
    </div>
  );
}
