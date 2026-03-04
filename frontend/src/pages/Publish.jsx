import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, Image, BookOpen, Zap, Check,
  ChevronRight, AlertCircle, Loader, ExternalLink
} from "lucide-react";
import { ethers } from "ethers";
import { useWeb3 } from "../context/Web3Context";

const GENRES = ["시", "소설", "수필/에세이", "희곡", "동화", "SF", "판타지", "로맨스", "미스터리", "자기계발", "인문학", "기타"];
const STEPS = ["문서 업로드", "도서 정보", "EPUB 생성", "NFT 발행"];

const ROYALTY_OPTIONS = [
  { label: "5%", value: 500 },
  { label: "8%", value: 800 },
  { label: "10%", value: 1000 },
  { label: "15%", value: 1500 },
];

export default function Publish() {
  const { account, contracts, connectWallet } = useWeb3();
  const [currentStep, setCurrentStep] = useState(0);

  // 파일 상태
  const [docFile, setDocFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [uploadedDoc, setUploadedDoc] = useState(null);
  const [uploadedCover, setUploadedCover] = useState(null);
  const [preview, setPreview] = useState(null);

  // 메타데이터
  const [metadata, setMetadata] = useState({
    title: "",
    author: "",
    genre: "소설",
    description: "",
    language: "ko",
    publisherName: "",
    isLimitedEdition: false,
    totalEditions: 100,
    royaltyPercent: 1000,
  });

  // 결과
  const [epubResult, setEpubResult] = useState(null);
  const [ipfsResult, setIpfsResult] = useState(null);
  const [mintedTokenId, setMintedTokenId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 문서 드롭존
  const onDocDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setDocFile(file);

    const toastId = toast.loading("파일 업로드 중...");
    try {
      const formData = new FormData();
      formData.append("document", file);
      const res = await axios.post("/api/upload/document", formData);
      setUploadedDoc(res.data.file);
      toast.success("파일 업로드 완료!", { id: toastId });

      // 미리보기 추출
      const previewRes = await axios.post("/api/ebook/preview", {
        filePath: res.data.file.path,
        mimeType: res.data.file.mimetype,
      });
      setPreview(previewRes.data);
    } catch (err) {
      toast.error(`업로드 실패: ${err.response?.data?.error || err.message}`, { id: toastId });
    }
  }, []);

  // 표지 드롭존
  const onCoverDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setCoverFile(file);
    const formData = new FormData();
    formData.append("cover", file);
    try {
      const res = await axios.post("/api/upload/cover", formData);
      setUploadedCover(res.data.cover);
      toast.success("표지 이미지 업로드 완료!");
    } catch (err) {
      toast.error("표지 업로드 실패");
    }
  }, []);

  const { getRootProps: getDocRootProps, getInputProps: getDocInputProps, isDragActive: isDocDrag } = useDropzone({
    onDrop: onDocDrop,
    accept: {
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/markdown": [".md"],
    },
    maxFiles: 1,
  });

  const { getRootProps: getCoverRootProps, getInputProps: getCoverInputProps, isDragActive: isCoverDrag } = useDropzone({
    onDrop: onCoverDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 1,
  });

  // STEP 2 → 3: EPUB 생성
  const generateEpub = async () => {
    if (!uploadedDoc) return toast.error("먼저 문서를 업로드해주세요.");
    if (!metadata.title || !metadata.author) return toast.error("제목과 저자명을 입력해주세요.");

    setIsProcessing(true);
    const toastId = toast.loading("EPUB 생성 중...");
    try {
      const res = await axios.post("/api/ebook/generate", {
        filePath: uploadedDoc.path,
        mimeType: uploadedDoc.mimetype,
        coverImagePath: uploadedCover?.path || null,
        ...metadata,
      });
      setEpubResult(res.data.epub);
      toast.success(`EPUB 생성 완료! (${res.data.epub.chapters}개 챕터)`, { id: toastId });
      setCurrentStep(2);
    } catch (err) {
      toast.error(`EPUB 생성 실패: ${err.response?.data?.error || err.message}`, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  // STEP 3 → 4: IPFS 업로드 + NFT 발행
  const uploadToIPFS = async () => {
    if (!epubResult) return;
    setIsProcessing(true);
    const toastId = toast.loading("IPFS에 업로드 중...");

    try {
      // 1. EPUB → IPFS
      const epubRes = await axios.post("/api/ipfs/upload-epub", {
        filename: epubResult.filename,
        title: metadata.title,
        author: metadata.author,
      });

      // 2. 메타데이터 → IPFS
      const metaRes = await axios.post("/api/ipfs/upload-metadata", {
        metadata: {
          title: metadata.title,
          author: metadata.author,
          genre: metadata.genre,
          description: metadata.description,
          language: metadata.language,
          epubIpfsHash: epubRes.data.ipfsHash,
          coverIpfsUrl: uploadedCover ? `https://gateway.pinata.cloud/ipfs/${uploadedCover.ipfsHash || ""}` : "",
          edition: metadata.isLimitedEdition ? "한정판" : "일반판",
          totalEditions: metadata.isLimitedEdition ? metadata.totalEditions : "무제한",
          publisher: metadata.publisherName || `${metadata.author} 독립출판`,
        },
      });

      setIpfsResult({ epub: epubRes.data, meta: metaRes.data });
      toast.success("IPFS 업로드 완료!", { id: toastId });
      setCurrentStep(3);
    } catch (err) {
      toast.error(`IPFS 업로드 실패: ${err.response?.data?.error || err.message}`, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  // NFT 민팅
  const mintNFT = async () => {
    if (!account) return toast.error("지갑을 먼저 연결해주세요.");
    if (!contracts.nft) return toast.error("컨트랙트가 연결되지 않았습니다. 올바른 네트워크를 확인하세요.");
    if (!ipfsResult) return toast.error("먼저 IPFS 업로드를 완료해주세요.");

    setIsProcessing(true);
    const toastId = toast.loading("NFT 민팅 중... MetaMask에서 승인해주세요.");
    try {
      const ebookMetadata = {
        title: metadata.title,
        author: metadata.author,
        genre: metadata.genre,
        description: metadata.description,
        epubIpfsHash: ipfsResult.epub.ipfsHash,
        coverIpfsHash: "",
        publishedAt: 0n,
        totalEditions: BigInt(metadata.isLimitedEdition ? metadata.totalEditions : 0),
        mintedCount: 0n,
        isLimitedEdition: metadata.isLimitedEdition,
      };

      const tx = await contracts.nft.mintEbook(
        account,
        ipfsResult.meta.metadataUrl || `ipfs://${ipfsResult.meta.ipfsHash}`,
        ebookMetadata,
        metadata.royaltyPercent
      );

      toast.loading("트랜잭션 확인 중...", { id: toastId });
      const receipt = await tx.wait();

      // 이벤트에서 tokenId 추출
      const event = receipt.logs.find(log => {
        try {
          const parsed = contracts.nft.interface.parseLog(log);
          return parsed?.name === "EbookMinted";
        } catch { return false; }
      });

      const tokenId = event
        ? contracts.nft.interface.parseLog(event).args.tokenId
        : "?";

      setMintedTokenId(tokenId.toString());
      toast.success(`🎉 NFT 발행 완료! Token ID: ${tokenId}`, { id: toastId });
    } catch (err) {
      if (err.code === 4001) {
        toast.error("사용자가 트랜잭션을 거부했습니다.", { id: toastId });
      } else {
        toast.error(`민팅 실패: ${err.message}`, { id: toastId });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const updateMeta = (field, value) => setMetadata(prev => ({ ...prev, [field]: value }));

  return (
    <div className="publish-page container">
      <div className="publish-header">
        <h1>작품 출판하기</h1>
        <p>창작 문서를 EPUB으로 변환하고 NFT로 저작권을 등록하세요</p>
      </div>

      {/* 단계 표시기 */}
      <div className="step-indicator">
        {STEPS.map((step, i) => (
          <React.Fragment key={step}>
            <div className={`step-dot ${i <= currentStep ? "active" : ""} ${i < currentStep ? "done" : ""}`}>
              {i < currentStep ? <Check size={14} /> : <span>{i + 1}</span>}
              <div className="step-dot-label">{step}</div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`step-line ${i < currentStep ? "done" : ""}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="publish-layout">
        {/* 왼쪽: 단계별 콘텐츠 */}
        <div className="publish-main">
          <AnimatePresence mode="wait">
            {/* STEP 0: 문서 업로드 */}
            {currentStep === 0 && (
              <motion.div key="step0" className="step-content glass-card"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="step-title"><FileText size={22} /> 문서 업로드</h2>
                <p className="step-desc">TXT, DOCX, PDF, MD 형식의 창작 문서를 업로드하세요.</p>

                <div {...getDocRootProps()} className={`dropzone ${isDocDrag ? "drag-active" : ""} ${uploadedDoc ? "has-file" : ""}`}>
                  <input {...getDocInputProps()} />
                  {uploadedDoc ? (
                    <div className="drop-success">
                      <Check size={32} className="drop-check" />
                      <p>{docFile?.name}</p>
                      <span>{(docFile?.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ) : (
                    <div className="drop-prompt">
                      <Upload size={40} className="drop-icon" />
                      <p>파일을 드래그하거나 <strong>클릭</strong>하여 선택</p>
                      <span>.txt · .docx · .pdf · .md</span>
                    </div>
                  )}
                </div>

                {preview && (
                  <div className="preview-box">
                    <h4>미리보기 ({preview.estimatedPages}페이지 예상)</h4>
                    <p>{preview.preview}</p>
                  </div>
                )}

                <div className="cover-section">
                  <h3><Image size={18} /> 표지 이미지 (선택)</h3>
                  <div {...getCoverRootProps()} className={`dropzone cover-dropzone ${isCoverDrag ? "drag-active" : ""}`}>
                    <input {...getCoverInputProps()} />
                    {uploadedCover ? (
                      <div className="drop-success">
                        <Check size={24} className="drop-check" />
                        <span>표지 업로드 완료</span>
                      </div>
                    ) : (
                      <div className="drop-prompt">
                        <Image size={28} className="drop-icon" />
                        <span>표지 이미지 (JPG, PNG)</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  className="btn btn-primary step-next-btn"
                  onClick={() => setCurrentStep(1)}
                  disabled={!uploadedDoc}
                >
                  다음: 도서 정보 입력 <ChevronRight size={18} />
                </button>
              </motion.div>
            )}

            {/* STEP 1: 도서 정보 */}
            {currentStep === 1 && (
              <motion.div key="step1" className="step-content glass-card"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="step-title"><BookOpen size={22} /> 도서 정보 입력</h2>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">제목 *</label>
                    <input className="form-input" placeholder="작품 제목" value={metadata.title}
                      onChange={e => updateMeta("title", e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">저자명 *</label>
                    <input className="form-input" placeholder="저자 이름 또는 필명" value={metadata.author}
                      onChange={e => updateMeta("author", e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">장르</label>
                    <select className="form-input" value={metadata.genre}
                      onChange={e => updateMeta("genre", e.target.value)}>
                      {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">언어</label>
                    <select className="form-input" value={metadata.language}
                      onChange={e => updateMeta("language", e.target.value)}>
                      <option value="ko">한국어</option>
                      <option value="en">영어</option>
                      <option value="ja">일본어</option>
                      <option value="zh">중국어</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">출판사명 (개인 출판사)</label>
                  <input className="form-input" placeholder={`${metadata.author || "저자"} 독립출판`}
                    value={metadata.publisherName}
                    onChange={e => updateMeta("publisherName", e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">작품 소개</label>
                  <textarea className="form-input" rows="4" placeholder="작품에 대한 소개를 작성해주세요..."
                    value={metadata.description}
                    onChange={e => updateMeta("description", e.target.value)} />
                </div>

                {/* NFT 설정 */}
                <div className="nft-settings glass-card">
                  <h3><Zap size={18} /> NFT 설정</h3>

                  <div className="form-group">
                    <label className="form-label">로열티 (재판매 시 저자 수수료)</label>
                    <div className="royalty-options">
                      {ROYALTY_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          className={`royalty-btn ${metadata.royaltyPercent === opt.value ? "selected" : ""}`}
                          onClick={() => updateMeta("royaltyPercent", opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="toggle-label">
                      <input type="checkbox" checked={metadata.isLimitedEdition}
                        onChange={e => updateMeta("isLimitedEdition", e.target.checked)} />
                      <span>한정판 발행</span>
                    </label>
                    {metadata.isLimitedEdition && (
                      <div style={{ marginTop: "12px" }}>
                        <label className="form-label">총 발행 부수</label>
                        <input type="number" className="form-input" min="1" max="10000"
                          value={metadata.totalEditions}
                          onChange={e => updateMeta("totalEditions", parseInt(e.target.value))} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="step-nav-btns">
                  <button className="btn btn-secondary" onClick={() => setCurrentStep(0)}>← 이전</button>
                  <button className="btn btn-primary step-next-btn" onClick={generateEpub} disabled={isProcessing}>
                    {isProcessing ? <><Loader size={16} className="spin" /> 생성 중...</> : <>EPUB 생성하기 <ChevronRight size={18} /></>}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: EPUB 생성 완료 + IPFS 업로드 */}
            {currentStep === 2 && epubResult && (
              <motion.div key="step2" className="step-content glass-card"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="step-title"><Check size={22} className="success-icon" /> EPUB 생성 완료</h2>

                <div className="result-card">
                  <div className="result-item">
                    <span>파일명</span><code>{epubResult.filename}</code>
                  </div>
                  <div className="result-item">
                    <span>파일 크기</span><code>{(epubResult.fileSize / 1024).toFixed(1)} KB</code>
                  </div>
                  <div className="result-item">
                    <span>챕터 수</span><code>{epubResult.chapters}개</code>
                  </div>
                </div>

                <a href={epubResult.downloadUrl} download className="btn btn-secondary" style={{ marginBottom: "20px" }}>
                  <BookOpen size={16} /> EPUB 다운로드
                </a>

                <div className="ipfs-section">
                  <h3><Zap size={18} /> IPFS에 업로드</h3>
                  <p className="info-text">
                    EPUB 파일을 분산 저장소(IPFS)에 영구 보관하고 NFT 메타데이터를 생성합니다.
                  </p>
                  <div className="info-note">
                    <AlertCircle size={14} />
                    Pinata API 키가 없으면 데모 모드로 동작합니다.
                  </div>
                </div>

                <div className="step-nav-btns">
                  <button className="btn btn-secondary" onClick={() => setCurrentStep(1)}>← 이전</button>
                  <button className="btn btn-primary step-next-btn" onClick={uploadToIPFS} disabled={isProcessing}>
                    {isProcessing ? <><Loader size={16} className="spin" /> 업로드 중...</> : <>IPFS 업로드 & NFT 발행 준비 <ChevronRight size={18} /></>}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: NFT 발행 */}
            {currentStep === 3 && (
              <motion.div key="step3" className="step-content glass-card"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="step-title"><Zap size={22} /> NFT 발행</h2>

                {ipfsResult && (
                  <div className="result-card">
                    <div className="result-item">
                      <span>EPUB IPFS</span>
                      <a href={ipfsResult.epub.ipfsUrl} target="_blank" rel="noopener noreferrer">
                        <code>{ipfsResult.epub.ipfsHash?.slice(0, 20)}...</code>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                    <div className="result-item">
                      <span>메타데이터 IPFS</span>
                      <code>{ipfsResult.meta.ipfsHash?.slice(0, 20)}...</code>
                    </div>
                    {ipfsResult.epub.isDemoMode && (
                      <div className="info-note" style={{ marginTop: "8px" }}>
                        <AlertCircle size={14} />
                        데모 모드: 실제 IPFS 대신 임시 해시 사용
                      </div>
                    )}
                  </div>
                )}

                {mintedTokenId ? (
                  <div className="mint-success">
                    <div className="mint-success-icon">🎉</div>
                    <h3>NFT 발행 완료!</h3>
                    <p>Token ID: <strong>#{mintedTokenId}</strong></p>
                    <p>제목: <strong>{metadata.title}</strong></p>
                    <p>로열티: <strong>{(metadata.royaltyPercent / 100).toFixed(1)}%</strong></p>
                  </div>
                ) : (
                  <>
                    {!account ? (
                      <div className="wallet-prompt">
                        <AlertCircle size={24} />
                        <p>NFT 발행을 위해 지갑 연결이 필요합니다.</p>
                        <button className="btn btn-primary" onClick={connectWallet}>지갑 연결</button>
                      </div>
                    ) : (
                      <button className="btn btn-primary mint-btn" onClick={mintNFT} disabled={isProcessing}>
                        {isProcessing
                          ? <><Loader size={18} className="spin" /> MetaMask 승인 대기 중...</>
                          : <><Zap size={18} /> NFT 발행하기 (블록체인 기록)</>
                        }
                      </button>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 오른쪽: 미리보기 사이드바 */}
        <div className="publish-sidebar">
          <div className="sidebar-preview glass-card">
            <h3>발행 정보 요약</h3>
            <div className="sidebar-cover">
              {coverFile ? (
                <img src={URL.createObjectURL(coverFile)} alt="표지" />
              ) : (
                <div className="sidebar-cover-placeholder"><BookOpen size={32} /></div>
              )}
            </div>
            <div className="sidebar-info">
              <p className="sidebar-title">{metadata.title || "제목 미입력"}</p>
              <p className="sidebar-author">{metadata.author || "저자 미입력"}</p>
              {metadata.genre && <span className="badge badge-primary">{metadata.genre}</span>}
            </div>
            <div className="sidebar-details">
              {metadata.isLimitedEdition && (
                <div className="detail-row">
                  <span>한정판</span>
                  <span>{metadata.totalEditions}부</span>
                </div>
              )}
              <div className="detail-row">
                <span>로열티</span>
                <span>{(metadata.royaltyPercent / 100).toFixed(1)}%</span>
              </div>
              {docFile && (
                <div className="detail-row">
                  <span>원본 파일</span>
                  <span>{docFile.name.slice(-20)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .publish-page { padding: 48px 0 80px; }
        .publish-header { text-align: center; margin-bottom: 48px; }
        .publish-header h1 { font-size: 2.2rem; font-weight: 700; font-family: var(--font-serif); margin-bottom: 8px; }
        .publish-header p { color: #a5b4fc; }

        /* 스텝 인디케이터 */
        .step-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-bottom: 48px;
          flex-wrap: wrap;
          gap: 4px;
        }
        .step-dot {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          position: relative;
        }
        .step-dot > span, .step-dot > svg {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: rgba(99,102,241,0.15);
          border: 2px solid rgba(99,102,241,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          font-weight: 600;
          color: #6b7280;
          transition: all 0.3s;
        }
        .step-dot.active > span, .step-dot.active > svg {
          background: rgba(99,102,241,0.3);
          border-color: #6366f1;
          color: #a5b4fc;
        }
        .step-dot.done > span, .step-dot.done > svg {
          background: #6366f1;
          border-color: #6366f1;
          color: white;
        }
        .step-dot-label {
          position: absolute;
          top: 42px;
          font-size: 0.7rem;
          color: #6b7280;
          white-space: nowrap;
        }
        .step-dot.active .step-dot-label { color: #a5b4fc; }
        .step-line {
          width: 60px; height: 2px;
          background: rgba(99,102,241,0.2);
          margin-bottom: 24px;
          transition: background 0.3s;
        }
        .step-line.done { background: #6366f1; }

        /* 레이아웃 */
        .publish-layout {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 32px;
          align-items: start;
          margin-top: 48px;
        }

        /* 콘텐츠 */
        .step-content { padding: 32px; }
        .step-title {
          display: flex; align-items: center; gap: 12px;
          font-size: 1.4rem; font-weight: 700;
          margin-bottom: 8px;
        }
        .step-desc { color: #9ca3af; margin-bottom: 24px; }
        .success-icon { color: #10b981; }

        /* 드롭존 */
        .dropzone {
          border: 2px dashed rgba(99,102,241,0.4);
          border-radius: 14px;
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 20px;
          background: rgba(99,102,241,0.04);
        }
        .dropzone:hover, .dropzone.drag-active {
          border-color: #6366f1;
          background: rgba(99,102,241,0.1);
        }
        .dropzone.has-file { border-color: #10b981; background: rgba(16,185,129,0.05); }
        .cover-dropzone { padding: 20px; }
        .drop-icon { color: rgba(99,102,241,0.5); margin-bottom: 12px; }
        .drop-prompt { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #9ca3af; }
        .drop-prompt strong { color: #6366f1; }
        .drop-prompt span { font-size: 0.8rem; color: #6b7280; }
        .drop-success { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #10b981; }
        .drop-check { color: #10b981; }

        /* 미리보기 */
        .preview-box {
          background: rgba(0,0,0,0.2);
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 20px;
        }
        .preview-box h4 { font-size: 0.85rem; color: #a5b4fc; margin-bottom: 8px; }
        .preview-box p { font-size: 0.85rem; color: #9ca3af; line-height: 1.7; }

        /* 폼 */
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .cover-section { margin-top: 4px; }
        .cover-section h3 { display: flex; align-items: center; gap: 8px; font-size: 1rem; margin-bottom: 12px; color: #a5b4fc; }

        /* NFT 설정 */
        .nft-settings {
          padding: 20px;
          margin-top: 8px;
        }
        .nft-settings h3 { display: flex; align-items: center; gap: 8px; font-size: 1rem; margin-bottom: 16px; color: #a5b4fc; }
        .royalty-options { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
        .royalty-btn {
          padding: 8px 20px;
          border-radius: 8px;
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.3);
          color: #a5b4fc;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.95rem;
        }
        .royalty-btn.selected {
          background: rgba(99,102,241,0.3);
          border-color: #6366f1;
          color: white;
        }
        .toggle-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 0.95rem;
        }
        .toggle-label input { width: 18px; height: 18px; cursor: pointer; accent-color: #6366f1; }

        /* 결과 카드 */
        .result-card {
          background: rgba(0,0,0,0.2);
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 20px;
        }
        .result-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          font-size: 0.9rem;
          gap: 12px;
        }
        .result-item:last-child { border-bottom: none; }
        .result-item span { color: #9ca3af; flex-shrink: 0; }
        .result-item code { font-size: 0.82rem; color: #a5b4fc; word-break: break-all; }
        .result-item a { display: flex; align-items: center; gap: 4px; }

        /* 버튼 */
        .step-nav-btns { display: flex; gap: 12px; margin-top: 24px; }
        .step-next-btn { flex: 1; justify-content: center; }
        .mint-btn { width: 100%; justify-content: center; padding: 16px; font-size: 1rem; }

        /* 정보 노트 */
        .info-text { color: #9ca3af; font-size: 0.9rem; margin-bottom: 12px; line-height: 1.7; }
        .info-note {
          display: flex; align-items: center; gap: 8px;
          color: #f59e0b; font-size: 0.82rem;
          background: rgba(245,158,11,0.1);
          padding: 8px 12px;
          border-radius: 8px;
        }
        .ipfs-section h3 { display: flex; align-items: center; gap: 8px; font-size: 1rem; margin-bottom: 12px; color: #a5b4fc; }

        /* 민트 성공 */
        .mint-success {
          text-align: center;
          padding: 32px;
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 14px;
        }
        .mint-success-icon { font-size: 3rem; margin-bottom: 16px; }
        .mint-success h3 { color: #10b981; font-size: 1.4rem; margin-bottom: 12px; }
        .mint-success p { color: #9ca3af; margin-bottom: 4px; }
        .wallet-prompt {
          text-align: center;
          padding: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          color: #f59e0b;
        }

        /* 사이드바 */
        .publish-sidebar { position: sticky; top: 80px; }
        .sidebar-preview { padding: 24px; }
        .sidebar-preview h3 { font-size: 0.95rem; color: #a5b4fc; margin-bottom: 16px; font-weight: 600; }
        .sidebar-cover {
          width: 100%; aspect-ratio: 3/4;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 16px;
          background: linear-gradient(135deg, #1a1730, #312e81);
        }
        .sidebar-cover img { width: 100%; height: 100%; object-fit: cover; }
        .sidebar-cover-placeholder {
          width: 100%; height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(99,102,241,0.3);
        }
        .sidebar-info { margin-bottom: 16px; }
        .sidebar-title { font-size: 1.05rem; font-weight: 700; margin-bottom: 4px; font-family: var(--font-serif); }
        .sidebar-author { font-size: 0.85rem; color: #a5b4fc; margin-bottom: 8px; }
        .sidebar-details {}
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          font-size: 0.85rem;
        }
        .detail-row span:first-child { color: #9ca3af; }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spin { animation: spin 0.8s linear infinite; }

        @media (max-width: 900px) {
          .publish-layout { grid-template-columns: 1fr; }
          .publish-sidebar { display: none; }
          .form-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
