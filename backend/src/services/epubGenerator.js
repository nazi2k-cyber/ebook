const Epub = require("epub-gen-memory").default;
const mammoth = require("mammoth");
const pdf = require("pdf-parse");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const OUTPUT_DIR = path.join(__dirname, "../../../epub-output");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * 다양한 문서 형식에서 텍스트 추출
 */
async function extractTextFromFile(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();

  // TXT 파일
  if (ext === ".txt" || mimeType === "text/plain") {
    const content = fs.readFileSync(filePath, "utf-8");
    return { text: content, html: textToHtml(content) };
  }

  // DOCX 파일
  if (ext === ".docx" || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.convertToHtml({ path: filePath });
    const text = await mammoth.extractRawText({ path: filePath });
    return { text: text.value, html: result.value };
  }

  // DOC 파일 (mammoth도 지원)
  if (ext === ".doc" || mimeType === "application/msword") {
    try {
      const result = await mammoth.convertToHtml({ path: filePath });
      const text = await mammoth.extractRawText({ path: filePath });
      return { text: text.value, html: result.value };
    } catch (e) {
      throw new Error("DOC 파일 변환 실패. DOCX 형식으로 저장 후 다시 시도하세요.");
    }
  }

  // PDF 파일
  if (ext === ".pdf" || mimeType === "application/pdf") {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return { text: data.text, html: textToHtml(data.text) };
  }

  // HTML 파일
  if (ext === ".html" || ext === ".htm") {
    const content = fs.readFileSync(filePath, "utf-8");
    const text = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return { text, html: content };
  }

  // Markdown 파일
  if (ext === ".md") {
    const content = fs.readFileSync(filePath, "utf-8");
    return { text: content, html: markdownToHtml(content) };
  }

  throw new Error(`지원하지 않는 파일 형식: ${ext}`);
}

/**
 * 평문 텍스트를 HTML로 변환 (단락 처리)
 */
function textToHtml(text) {
  const paragraphs = text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => {
      // 시 형식 감지 (짧은 줄들의 연속)
      const lines = p.split("\n");
      if (lines.length > 1 && lines.every(l => l.length < 80)) {
        return `<p class="poetry">${lines.join("<br/>")}</p>`;
      }
      return `<p>${p.replace(/\n/g, " ")}</p>`;
    });
  return paragraphs.join("\n");
}

/**
 * 기본 마크다운 → HTML 변환
 */
function markdownToHtml(md) {
  return md
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(.+)$/gm, (m, p1) => {
      if (p1.startsWith("<")) return p1;
      return p1;
    })
    .replace(/^(?!<)(.+)(?!>)$/gm, "<p>$1</p>");
}

/**
 * 콘텐츠를 챕터 단위로 분할
 */
function splitIntoChapters(html, title) {
  // h1, h2 태그 기준으로 챕터 분리
  const chapterRegex = /<h[12][^>]*>(.+?)<\/h[12]>/gi;
  const parts = html.split(chapterRegex);

  if (parts.length <= 1) {
    // 챕터 구분 없으면 단일 챕터
    return [{ title, data: html }];
  }

  const chapters = [];
  // 서문 (첫 번째 h1 이전 내용)
  if (parts[0].trim()) {
    chapters.push({ title: "서문", data: parts[0] });
  }

  for (let i = 1; i < parts.length; i += 2) {
    const chapterTitle = parts[i];
    const chapterContent = parts[i + 1] || "";
    chapters.push({
      title: chapterTitle,
      data: `<h2>${chapterTitle}</h2>${chapterContent}`,
    });
  }

  return chapters.length > 0 ? chapters : [{ title, data: html }];
}

/**
 * EPUB 파일 생성 메인 함수
 */
async function generateEpub(options) {
  const {
    filePath,
    mimeType,
    title,
    author,
    genre,
    description,
    language = "ko",
    coverImagePath,
    publisherName,
  } = options;

  // 텍스트 추출
  const { html } = await extractTextFromFile(filePath, mimeType);

  // 챕터 분할
  const chapters = splitIntoChapters(html, title);

  // EPUB 옵션 구성
  const epubOptions = {
    title,
    author,
    publisher: publisherName || `${author} 독립출판`,
    description,
    language,
    tocTitle: "목차",
    date: new Date().toISOString(),
    content: chapters,
    css: getEpubStylesheet(),
    fonts: [],
    cover: coverImagePath && fs.existsSync(coverImagePath) ? coverImagePath : undefined,
    customOpfTemplatePath: null,
    customNcxTocTemplatePath: null,
    customHtmlTocTemplatePath: null,
  };

  // 메타데이터 추가
  if (genre) {
    epubOptions.subject = genre;
  }

  // EPUB 생성
  const outputFilename = `${uuidv4()}.epub`;
  const outputPath = path.join(OUTPUT_DIR, outputFilename);

  const epub = new Epub(epubOptions);
  const epubContent = await epub.genEpub();

  fs.writeFileSync(outputPath, epubContent);

  return {
    filename: outputFilename,
    outputPath,
    fileSize: fs.statSync(outputPath).size,
    chapters: chapters.length,
    title,
    author,
  };
}

/**
 * EPUB 스타일시트
 */
function getEpubStylesheet() {
  return `
    body {
      font-family: "Noto Serif KR", "Nanum Myeongjo", Georgia, serif;
      font-size: 1em;
      line-height: 1.8;
      margin: 0 5%;
      color: #1a1a1a;
    }

    h1 {
      font-size: 1.8em;
      text-align: center;
      margin: 2em 0 1em;
      font-weight: bold;
      border-bottom: 2px solid #333;
      padding-bottom: 0.5em;
    }

    h2 {
      font-size: 1.4em;
      margin: 1.5em 0 0.8em;
      font-weight: bold;
    }

    h3 {
      font-size: 1.2em;
      margin: 1.2em 0 0.6em;
    }

    p {
      margin: 0.8em 0;
      text-align: justify;
      text-indent: 1em;
    }

    p.poetry {
      text-align: center;
      text-indent: 0;
      font-style: italic;
      margin: 1.5em 2em;
      line-height: 2.2;
    }

    blockquote {
      margin: 1em 2em;
      padding: 0.5em 1em;
      border-left: 3px solid #666;
      font-style: italic;
    }

    .chapter-title {
      text-align: center;
      font-size: 1.6em;
      margin: 3em 0 2em;
    }

    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 1em auto;
    }
  `;
}

/**
 * 임시 파일 정리
 */
function cleanupFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    console.error("파일 정리 실패:", e.message);
  }
}

module.exports = { generateEpub, extractTextFromFile, cleanupFile };
