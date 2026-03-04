import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, Image, BookOpen, Download, Check,
  ChevronRight, ChevronLeft, Loader, Wallet,
} from "lucide-react";
import { generateEpubClient } from "../utils/clientEpub";
import { useWeb3 } from "../context/Web3Context";

const GENRES = ["시", "소설", "수필/에세이", "희곡", "동화", "SF", "판타지", "로맨스", "미스터리", "자기계발", "인문학", "기타"];
const STEPS = ["문서 업로드", "도서 정보 입력", "EPUB 완성"];

export default function Publish() {
  const { account, connectWallet } = useWeb3();
  const [step, setStep] = useState(0);

  const [docFile, setDocFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(null);

  const [form, setForm] = useState({
    title: "",
    author: "",
    genre: "소설",
    description: "",
    language: "ko",
  });

  const [epubResult, setEpubResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // ── 문서 드롭존 ──────────────────────────────────────
  const onDocDrop = useCallback((files) => {
    const file = files[0];
    if (!file) return;
    setDocFile(file);
    const autoTitle = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
    setForm(f => ({ ...f, title: f.title || autoTitle }));
    toast.success(`"${file.name}" 선택됨`);
    setStep(1);
  }, []);

  const { getRootProps: docRP, getInputProps: docIP, isDragActive: docDrag } = useDropzone({
    onDrop: onDocDrop,
    accept: {
      "text/plain": [".txt"],
      "text/markdown": [".md"],
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/html": [".html", ".htm"],
    },
    maxFiles: 1,
  });

  // ── 표지 드롭존 ──────────────────────────────────────
  const onCoverDrop = useCallback((files) => {
    const file = files[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreviewUrl(URL.createObjectURL(file));
    toast.success("표지 이미지 선택됨");
  }, []);

  const { getRootProps: covRP, getInputProps: covIP } = useDropzone({
    onDrop: onCoverDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 1,
  });

  // ── EPUB 생성 ─────────────────────────────────────────
  const handleGenerate = async () => {
    if (!form.title.trim() || !form.author.trim()) {
      toast.error("제목과 저자명을 입력하세요.");
      return;
    }
    setIsGenerating(true);
    const tid = toast.loading("EPUB 생성 중...");
    try {
      const result = await generateEpubClient(docFile, {
        title: form.title,
        author: form.author,
        genre: form.genre,
        description: form.description,
        language: form.language,
        coverFile: coverFile || null,
      });
      setEpubResult(result);
      toast.success(`완성! ${result.chapters}개 챕터`, { id: tid });
      setStep(2);
    } catch (e) {
      toast.error(`생성 실패: ${e.message}`, { id: tid });
    } finally {
      setIsGenerating(false);
    }
  };

  // ── EPUB 다운로드 ─────────────────────────────────────
  const handleDownload = () => {
    if (!epubResult) return;
    const url = URL.createObjectURL(epubResult.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = epubResult.filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("다운로드 시작!");
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
      {/* 헤더 */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "var(--font-serif)", marginBottom: 10 }}>
          내 글을 EPUB으로 만들기
        </h1>
        <p style={{ color: "#a5b4fc" }}>TXT · MD · DOCX · PDF · HTML → 전자책(EPUB) 무료 변환</p>
        <p style={{ color: "#6b7280", fontSize: "0.82rem", marginTop: 4 }}>파일이 서버로 전송되지 않습니다</p>
      </div>

      {/* 스텝 인디케이터 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 40 }}>
        {STEPS.map((label, i) => (
          <React.Fragment key={i}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: "0.9rem",
                background: i < step ? "#10b981" : i === step ? "#6366f1" : "rgba(255,255,255,0.07)",
                color: i <= step ? "#fff" : "#6b7280",
                border: i === step ? "2px solid #818cf8" : "2px solid transparent",
                transition: "all 0.3s",
              }}>
                {i < step ? <Check size={16} /> : i + 1}
              </div>
              <span style={{ fontSize: "0.72rem", color: i === step ? "#a5b4fc" : "#6b7280", whiteSpace: "nowrap" }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                height: 2, width: 48, margin: "0 6px", marginBottom: 22,
                background: i < step ? "#10b981" : "rgba(255,255,255,0.1)",
                transition: "background 0.3s",
              }} />
            )}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── 스텝 0: 문서 업로드 ── */}
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
            <div
              {...docRP()}
              style={{
                border: `2px dashed ${docDrag ? "#6366f1" : "rgba(99,102,241,0.35)"}`,
                borderRadius: 20, padding: "64px 32px", textAlign: "center",
                cursor: "pointer",
                background: docDrag ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)",
                transition: "all 0.2s",
              }}
            >
              <input {...docIP()} />
              <Upload size={48} style={{ color: "#6366f1", marginBottom: 20 }} />
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: 12 }}>
                {docDrag ? "놓으세요!" : "문서 파일을 드래그하거나 클릭하세요"}
              </h2>
              <p style={{ color: "#9ca3af", marginBottom: 20 }}>
                지원: <strong style={{ color: "#a5b4fc" }}>TXT · MD · DOCX · PDF · HTML</strong>
              </p>
              <div style={{
                display: "inline-block", padding: "11px 32px", borderRadius: 12,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff", fontWeight: 600, fontSize: "0.95rem",
              }}>
                파일 선택
              </div>
              <p style={{ color: "#6b7280", fontSize: "0.78rem", marginTop: 16 }}>
                모든 처리는 브라우저 내에서만 이루어집니다
              </p>
            </div>
          </motion.div>
        )}

        {/* ── 스텝 1: 도서 정보 입력 ── */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
            {/* 선택된 파일 표시 */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "11px 16px",
              background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)",
              borderRadius: 12, marginBottom: 24,
            }}>
              <FileText size={18} style={{ color: "#10b981" }} />
              <span style={{ flex: 1, fontSize: "0.9rem" }}>{docFile?.name}</span>
              <button
                onClick={() => { setDocFile(null); setStep(0); }}
                style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "0.8rem" }}
              >
                변경
              </button>
            </div>

            <div style={{
              background: "rgba(30,27,75,0.7)", border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: 20, padding: "28px 28px 32px",
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

                {/* 제목 */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={lbl}>책 제목 *</label>
                  <input style={inp} placeholder="예: 나의 첫 번째 시집"
                    value={form.title} onChange={e => setField("title", e.target.value)} />
                </div>

                {/* 저자 */}
                <div>
                  <label style={lbl}>저자명 *</label>
                  <input style={inp} placeholder="예: 홍길동"
                    value={form.author} onChange={e => setField("author", e.target.value)} />
                </div>

                {/* 장르 */}
                <div>
                  <label style={lbl}>장르</label>
                  <select style={inp} value={form.genre} onChange={e => setField("genre", e.target.value)}>
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                {/* 언어 */}
                <div>
                  <label style={lbl}>언어</label>
                  <select style={inp} value={form.language} onChange={e => setField("language", e.target.value)}>
                    <option value="ko">한국어</option>
                    <option value="en">English</option>
                    <option value="ja">日本語</option>
                    <option value="zh">中文</option>
                  </select>
                </div>

                {/* 소개글 */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={lbl}>책 소개 (선택)</label>
                  <textarea style={{ ...inp, minHeight: 72, resize: "vertical" }}
                    placeholder="독자에게 전하고 싶은 소개글"
                    value={form.description} onChange={e => setField("description", e.target.value)} />
                </div>

                {/* 표지 */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ ...lbl, marginBottom: 10 }}>표지 이미지 (선택)</label>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div
                      {...covRP()}
                      style={{
                        width: 100, height: 136, borderRadius: 8, overflow: "hidden",
                        border: "2px dashed rgba(99,102,241,0.35)",
                        background: "rgba(255,255,255,0.02)",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <input {...covIP()} />
                      {coverPreviewUrl
                        ? <img src={coverPreviewUrl} alt="표지" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ textAlign: "center", color: "#6b7280" }}>
                            <Image size={24} style={{ marginBottom: 4 }} />
                            <p style={{ fontSize: "0.7rem" }}>클릭</p>
                          </div>
                      }
                    </div>
                    <div style={{ color: "#9ca3af", fontSize: "0.82rem", paddingTop: 4 }}>
                      <p>JPG · PNG · WebP 지원</p>
                      <p style={{ marginTop: 4 }}>선택하지 않으면 기본 표지가 사용됩니다.</p>
                      {coverPreviewUrl && (
                        <button onClick={() => { setCoverFile(null); setCoverPreviewUrl(null); }}
                          style={{ marginTop: 8, background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.8rem" }}>
                          표지 제거
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 버튼 */}
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button onClick={() => setStep(0)} style={secBtn}>
                <ChevronLeft size={16} /> 이전
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !form.title.trim() || !form.author.trim()}
                style={{ ...priBtn, flex: 1, justifyContent: "center", opacity: (!form.title.trim() || !form.author.trim()) ? 0.5 : 1 }}
              >
                {isGenerating
                  ? <><Loader size={18} style={{ animation: "spin 0.8s linear infinite" }} /> 생성 중...</>
                  : <><BookOpen size={18} /> EPUB 생성하기 <ChevronRight size={16} /></>
                }
              </button>
            </div>

            {isGenerating && (
              <p style={{ textAlign: "center", color: "#a5b4fc", fontSize: "0.82rem", marginTop: 12 }}>
                PDF/DOCX는 최대 30초 소요될 수 있습니다
              </p>
            )}
          </motion.div>
        )}

        {/* ── 스텝 2: 완료 ── */}
        {step === 2 && epubResult && (
          <motion.div key="s2" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
            <div style={{
              background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: 20, padding: "40px 28px", textAlign: "center", marginBottom: 20,
            }}>
              <div style={{
                width: 68, height: 68, borderRadius: "50%",
                background: "rgba(16,185,129,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 18px",
              }}>
                <Check size={32} style={{ color: "#10b981" }} />
              </div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 6 }}>EPUB 완성!</h2>
              <p style={{ color: "#a5b4fc", marginBottom: 2 }}><strong>{epubResult.filename}</strong></p>
              <p style={{ color: "#6b7280", fontSize: "0.82rem", marginBottom: 24 }}>
                {epubResult.chapters}개 챕터 · {(epubResult.blob.size / 1024).toFixed(0)} KB
              </p>
              <button onClick={handleDownload} style={{ ...priBtn, fontSize: "1.05rem", padding: "14px 44px" }}>
                <Download size={20} /> EPUB 다운로드
              </button>
              <p style={{ color: "#6b7280", fontSize: "0.78rem", marginTop: 14 }}>
                리디북스 · 알라딘 · Apple Books · Calibre에서 바로 열 수 있습니다
              </p>
            </div>

            {/* 사용법 안내 */}
            <div style={{
              background: "rgba(30,27,75,0.5)", border: "1px solid rgba(99,102,241,0.15)",
              borderRadius: 16, padding: "18px 22px", marginBottom: 16,
            }}>
              <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "#a5b4fc", marginBottom: 10 }}>EPUB 여는 방법</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  ["📱 스마트폰", "리디북스 앱 → 내 파일"],
                  ["🍎 아이폰/아이패드", "파일 앱에서 열기"],
                  ["💻 PC", "Calibre (무료 앱)"],
                  ["📚 전자책 단말기", "USB로 복사 후 열기"],
                ].map(([k, v]) => (
                  <div key={k} style={{ fontSize: "0.82rem" }}>
                    <span style={{ fontWeight: 600 }}>{k}</span>
                    <br />
                    <span style={{ color: "#9ca3af" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* NFT 옵션 */}
            <div style={{
              background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.18)",
              borderRadius: 16, padding: "18px 22px",
            }}>
              <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "#a5b4fc", marginBottom: 6 }}>
                블록체인 저작권 등록 (선택사항)
              </p>
              <p style={{ color: "#9ca3af", fontSize: "0.82rem", marginBottom: 12 }}>
                MetaMask 지갑 연결 후 EPUB을 NFT로 등록해 저작권을 블록체인에 기록할 수 있습니다.
              </p>
              {account
                ? <p style={{ color: "#10b981", fontSize: "0.82rem" }}>✓ 지갑 연결됨 — NFT 거래소에서 판매 등록 가능</p>
                : <button onClick={connectWallet} style={secBtn}><Wallet size={15} /> MetaMask 연결</button>
              }
            </div>

            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button
                onClick={() => {
                  setStep(0); setDocFile(null); setCoverFile(null);
                  setCoverPreviewUrl(null); setEpubResult(null);
                  setForm({ title: "", author: "", genre: "소설", description: "", language: "ko" });
                }}
                style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "0.88rem" }}
              >
                + 새 파일 변환하기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const lbl = { display: "block", marginBottom: 5, fontSize: "0.83rem", color: "#a5b4fc", fontWeight: 500 };
const inp = {
  width: "100%", padding: "10px 13px",
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(99,102,241,0.3)",
  borderRadius: 10, color: "#e0e7ff", fontSize: "0.93rem",
  outline: "none", fontFamily: "var(--font-sans)",
};
const priBtn = {
  display: "inline-flex", alignItems: "center", gap: 8,
  padding: "12px 26px", borderRadius: 12,
  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  color: "#fff", border: "none", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer",
};
const secBtn = {
  display: "inline-flex", alignItems: "center", gap: 8,
  padding: "10px 18px", borderRadius: 12,
  background: "rgba(255,255,255,0.05)",
  color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)",
  fontWeight: 500, fontSize: "0.9rem", cursor: "pointer",
};
