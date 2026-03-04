import React, { useEffect, useRef, useState, useCallback } from "react";
import ePub from "epubjs";
import { ChevronLeft, ChevronRight, Settings, BookOpen, Moon, Sun, List, X, ZoomIn, ZoomOut } from "lucide-react";

const FONT_SIZES = [14, 16, 18, 20, 22, 24, 28];
const THEMES = {
  dark: {
    body: { background: "#0f0e17", color: "#e0e7ff" },
    name: "다크",
    icon: <Moon size={16} />,
  },
  light: {
    body: { background: "#fefefe", color: "#1a1a2e" },
    name: "라이트",
    icon: <Sun size={16} />,
  },
  sepia: {
    body: { background: "#f4ecd8", color: "#3b2f2f" },
    name: "세피아",
    icon: <BookOpen size={16} />,
  },
};

export default function EbookReader({ epubUrl, title, onClose }) {
  const viewerRef = useRef(null);
  const bookRef = useRef(null);
  const renditionRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [progress, setProgress] = useState(0);
  const [toc, setToc] = useState([]);
  const [showToc, setShowToc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [theme, setTheme] = useState("dark");

  const applySettings = useCallback((rendition, size, themeKey) => {
    if (!rendition) return;
    const themeStyles = THEMES[themeKey].body;
    rendition.themes.default({
      body: {
        ...themeStyles,
        "font-family": '"Noto Serif KR", "Nanum Myeongjo", Georgia, serif',
        "font-size": `${size}px`,
        "line-height": "1.9",
        "padding": "0 5%",
        "max-width": "700px",
        "margin": "0 auto",
      },
      p: { "text-indent": "1.5em", "margin-bottom": "0.5em" },
      "p.poetry": { "text-align": "center", "text-indent": "0", "font-style": "italic" },
      h1: { "font-size": "1.8em", "text-align": "center", "margin": "2em 0 1em" },
      h2: { "font-size": "1.4em", "margin": "1.5em 0 0.8em" },
    });
  }, []);

  useEffect(() => {
    if (!viewerRef.current || !epubUrl) return;

    const book = ePub(epubUrl);
    bookRef.current = book;

    const rendition = book.renderTo(viewerRef.current, {
      width: "100%",
      height: "100%",
      spread: "none",
      flow: "paginated",
    });
    renditionRef.current = rendition;

    applySettings(rendition, fontSize, theme);
    rendition.display();

    book.ready.then(() => {
      setIsLoading(false);
      book.navigation.then((nav) => {
        setToc(nav.toc || []);
      });
      book.locations.generate(1600).then(() => {
        setTotalPages(book.locations.total);
      });
    }).catch(err => {
      setError("epub 파일을 불러올 수 없습니다: " + err.message);
      setIsLoading(false);
    });

    rendition.on("relocated", (location) => {
      const loc = book.locations.locationFromCfi(location.start.cfi);
      setCurrentPage(loc || 0);
      setProgress(book.locations.percentageFromCfi(location.start.cfi) * 100);
    });

    return () => {
      book.destroy();
    };
  }, [epubUrl]);

  // 폰트/테마 변경 시 적용
  useEffect(() => {
    if (renditionRef.current) {
      applySettings(renditionRef.current, fontSize, theme);
      renditionRef.current.views().forEach(view => view.pane?.clear());
    }
  }, [fontSize, theme, applySettings]);

  const goPrev = () => renditionRef.current?.prev();
  const goNext = () => renditionRef.current?.next();
  const goToToc = (href) => {
    renditionRef.current?.display(href);
    setShowToc(false);
  };

  // 키보드 단축키
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const currentThemeStyle = {
    "--reader-bg": THEMES[theme].body.background,
    "--reader-color": THEMES[theme].body.color,
  };

  return (
    <div className="ebook-reader" style={currentThemeStyle}>
      {/* 상단 툴바 */}
      <div className="reader-toolbar">
        <button className="reader-btn" onClick={onClose} title="닫기">
          <X size={20} />
        </button>
        <div className="reader-title">{title}</div>
        <div className="reader-actions">
          <button className="reader-btn" onClick={() => setShowToc(!showToc)} title="목차">
            <List size={20} />
          </button>
          <button className="reader-btn" onClick={() => setShowSettings(!showSettings)} title="설정">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* 목차 패널 */}
      {showToc && (
        <div className="reader-panel toc-panel">
          <h3 className="panel-title">목차</h3>
          {toc.length === 0 ? (
            <p className="panel-empty">목차가 없습니다.</p>
          ) : (
            <ul className="toc-list">
              {toc.map((item, i) => (
                <li key={i}>
                  <button onClick={() => goToToc(item.href)} className="toc-item">
                    {item.label.trim()}
                  </button>
                  {item.subitems?.map((sub, j) => (
                    <button key={j} onClick={() => goToToc(sub.href)} className="toc-item toc-subitem">
                      {sub.label.trim()}
                    </button>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 설정 패널 */}
      {showSettings && (
        <div className="reader-panel settings-panel">
          <h3 className="panel-title">읽기 설정</h3>

          <div className="settings-section">
            <span className="settings-label">글자 크기</span>
            <div className="settings-row">
              <button
                className="reader-btn"
                onClick={() => setFontSize(f => Math.max(14, f - 2))}
                disabled={fontSize <= 14}
              >
                <ZoomOut size={16} />
              </button>
              <span className="font-size-display">{fontSize}px</span>
              <button
                className="reader-btn"
                onClick={() => setFontSize(f => Math.min(28, f + 2))}
                disabled={fontSize >= 28}
              >
                <ZoomIn size={16} />
              </button>
            </div>
          </div>

          <div className="settings-section">
            <span className="settings-label">테마</span>
            <div className="theme-buttons">
              {Object.entries(THEMES).map(([key, t]) => (
                <button
                  key={key}
                  className={`theme-btn ${theme === key ? "active" : ""}`}
                  onClick={() => setTheme(key)}
                  style={{
                    background: t.body.background,
                    color: t.body.color,
                    border: theme === key ? "2px solid #6366f1" : "1px solid #444",
                  }}
                >
                  {t.icon} {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 뷰어 영역 */}
      <div className="reader-content">
        <button className="nav-btn nav-prev" onClick={goPrev} title="이전 페이지 (←)">
          <ChevronLeft size={28} />
        </button>

        <div className="epub-viewport">
          {isLoading && (
            <div className="reader-loading">
              <div className="spinner" />
              <p>책을 불러오는 중...</p>
            </div>
          )}
          {error && (
            <div className="reader-error">
              <BookOpen size={48} />
              <p>{error}</p>
            </div>
          )}
          <div ref={viewerRef} className="epub-view" />
        </div>

        <button className="nav-btn nav-next" onClick={goNext} title="다음 페이지 (→)">
          <ChevronRight size={28} />
        </button>
      </div>

      {/* 하단 진행바 */}
      <div className="reader-footer">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="page-info">
          {totalPages > 0 ? `${currentPage} / ${totalPages}` : "로딩 중..."}
          {progress > 0 && ` (${progress.toFixed(1)}%)`}
        </div>
      </div>

      <style>{`
        .ebook-reader {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          background: var(--reader-bg, #0f0e17);
          color: var(--reader-color, #e0e7ff);
        }
        .reader-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          background: rgba(0,0,0,0.3);
          border-bottom: 1px solid rgba(255,255,255,0.1);
          flex-shrink: 0;
        }
        .reader-title {
          flex: 1;
          font-weight: 600;
          font-size: 1rem;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .reader-actions { display: flex; gap: 8px; }
        .reader-btn {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 8px;
          color: inherit;
          padding: 8px 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background 0.2s;
          font-size: 0.85rem;
        }
        .reader-btn:hover { background: rgba(99,102,241,0.3); }
        .reader-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .reader-panel {
          position: absolute;
          top: 56px;
          right: 0;
          width: 280px;
          background: rgba(15,14,23,0.97);
          border-left: 1px solid rgba(99,102,241,0.3);
          border-bottom: 1px solid rgba(99,102,241,0.3);
          padding: 20px;
          z-index: 10;
          max-height: 70vh;
          overflow-y: auto;
          border-bottom-left-radius: 16px;
        }
        .toc-panel { right: 40px; }
        .panel-title {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 16px;
          color: #a5b4fc;
        }
        .panel-empty { color: #6b7280; font-size: 0.9rem; }
        .toc-list { list-style: none; }
        .toc-item {
          display: block;
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          color: inherit;
          padding: 8px 10px;
          cursor: pointer;
          border-radius: 6px;
          font-size: 0.9rem;
          transition: background 0.15s;
        }
        .toc-item:hover { background: rgba(99,102,241,0.2); }
        .toc-subitem { padding-left: 24px; font-size: 0.85rem; opacity: 0.8; }
        .settings-section { margin-bottom: 20px; }
        .settings-label { font-size: 0.85rem; color: #a5b4fc; display: block; margin-bottom: 10px; }
        .settings-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .font-size-display { min-width: 50px; text-align: center; font-weight: 600; }
        .theme-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
        .theme-btn {
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
        }
        .reader-content {
          flex: 1;
          display: flex;
          align-items: center;
          overflow: hidden;
          position: relative;
        }
        .epub-viewport {
          flex: 1;
          height: 100%;
          position: relative;
          overflow: hidden;
        }
        .epub-view {
          width: 100%;
          height: 100%;
        }
        .reader-loading, .reader-error {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          background: var(--reader-bg, #0f0e17);
          z-index: 5;
          color: #6b7280;
        }
        .nav-btn {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: inherit;
          padding: 16px 12px;
          cursor: pointer;
          height: 100%;
          display: flex;
          align-items: center;
          transition: background 0.2s;
          flex-shrink: 0;
        }
        .nav-btn:hover { background: rgba(99,102,241,0.25); }
        .reader-footer {
          padding: 8px 20px;
          background: rgba(0,0,0,0.3);
          border-top: 1px solid rgba(255,255,255,0.08);
          flex-shrink: 0;
        }
        .progress-bar {
          height: 3px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 6px;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #8b5cf6);
          border-radius: 2px;
          transition: width 0.3s ease;
        }
        .page-info {
          text-align: center;
          font-size: 0.8rem;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}
