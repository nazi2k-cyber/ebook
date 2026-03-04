/**
 * EPUB 생성 서비스
 * epub-gen-memory를 사용하여 다양한 문서 형식을 EPUB으로 변환
 */
const mammoth = require("mammoth");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// epub-gen-memory는 default export가 함수 형태
let epubGenFn;
try {
  const mod = require("epub-gen-memory");
  // CommonJS: module.exports = fn 또는 module.exports.default = fn
  epubGenFn = mod.default || mod;
  if (typeof epubGenFn !== "function") {
    throw new Error("epub-gen-memory: expected a function export");
  }
} catch (e) {
  console.warn("epub-gen-memory 로드 실패, 폴백 사용:", e.message);
  epubGenFn = null;
}

const OUTPUT_DIR = path.join(__dirname, "../../../epub-output");
const UPLOAD_DIR = path.join(__dirname, "../../../uploads");

// 디렉토리 보장
[OUTPUT_DIR, UPLOAD_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── 문서 → HTML 변환 ─────────────────────────────────────────

async function extractTextFromFile(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".txt" || mimeType === "text/plain") {
    const content = fs.readFileSync(filePath, "utf-8");
    return { text: content, html: textToHtml(content) };
  }

  if (ext === ".docx" || mimeType?.includes("wordprocessingml")) {
    const [htmlRes, textRes] = await Promise.all([
      mammoth.convertToHtml({ path: filePath }),
      mammoth.extractRawText({ path: filePath }),
    ]);
    return { text: textRes.value, html: htmlRes.value || textToHtml(textRes.value) };
  }

  if (ext === ".doc" || mimeType === "application/msword") {
    try {
      const [htmlRes, textRes] = await Promise.all([
        mammoth.convertToHtml({ path: filePath }),
        mammoth.extractRawText({ path: filePath }),
      ]);
      return { text: textRes.value, html: htmlRes.value || textToHtml(textRes.value) };
    } catch {
      throw new Error("DOC 변환 실패. DOCX로 저장 후 다시 시도하세요.");
    }
  }

  if (ext === ".pdf" || mimeType === "application/pdf") {
    try {
      const pdf = require("pdf-parse");
      const buf = fs.readFileSync(filePath);
      const data = await pdf(buf);
      return { text: data.text, html: textToHtml(data.text) };
    } catch (e) {
      throw new Error(`PDF 파싱 실패: ${e.message}`);
    }
  }

  if (ext === ".md" || mimeType === "text/markdown") {
    const content = fs.readFileSync(filePath, "utf-8");
    return { text: content, html: markdownToHtml(content) };
  }

  if (ext === ".html" || ext === ".htm") {
    const content = fs.readFileSync(filePath, "utf-8");
    const text = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return { text, html: content };
  }

  throw new Error(`지원하지 않는 형식: ${ext}. (TXT·DOCX·PDF·MD 지원)`);
}

// ─── 텍스트 → HTML 변환 ───────────────────────────────────────

function textToHtml(text) {
  if (!text || !text.trim()) return "<p>(내용 없음)</p>";
  return text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => {
      const lines = p.split("\n");
      const isPoetry = lines.length > 1 && lines.every(l => l.length < 80);
      if (isPoetry) return `<p class="poetry">${lines.map(l => l.trim()).join("<br/>")}</p>`;
      return `<p>${p.replace(/\n/g, " ").trim()}</p>`;
    })
    .join("\n");
}

function markdownToHtml(md) {
  const lines = md.split("\n");
  const result = [];
  let inPara = false;
  const flushPara = (buf) => {
    if (buf.length) result.push(`<p>${buf.join(" ")}</p>`);
    return [];
  };
  let paraBuf = [];

  for (const rawLine of lines) {
    const line = rawLine;
    if (/^# /.test(line))       { paraBuf = flushPara(paraBuf); result.push(`<h1>${line.slice(2)}</h1>`); }
    else if (/^## /.test(line)) { paraBuf = flushPara(paraBuf); result.push(`<h2>${line.slice(3)}</h2>`); }
    else if (/^### /.test(line)){ paraBuf = flushPara(paraBuf); result.push(`<h3>${line.slice(4)}</h3>`); }
    else if (line.trim() === "")  { paraBuf = flushPara(paraBuf); }
    else { paraBuf.push(line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>")); }
  }
  flushPara(paraBuf);
  return result.join("\n");
}

// ─── 챕터 분할 ────────────────────────────────────────────────

function splitIntoChapters(html, title) {
  // h1/h2 태그 기준으로 분리
  const parts = html.split(/(<h[12][^>]*>.*?<\/h[12]>)/gi);
  if (parts.length <= 1) return [{ title, data: html }];

  const chapters = [];
  if (parts[0].trim()) chapters.push({ title: "서문", data: parts[0] });

  for (let i = 1; i < parts.length - 1; i += 2) {
    const heading = parts[i];
    const body = parts[i + 1] || "";
    const headingText = heading.replace(/<[^>]+>/g, "").trim();
    chapters.push({ title: headingText, data: `${heading}${body}` });
  }

  return chapters.length > 0 ? chapters : [{ title, data: html }];
}

// ─── EPUB 생성 ────────────────────────────────────────────────

async function generateEpub(options) {
  const {
    filePath, mimeType, title, author,
    genre, description, language = "ko",
    coverImagePath, publisherName,
  } = options;

  const { html } = await extractTextFromFile(filePath, mimeType);
  const chapters = splitIntoChapters(html, title);

  const outputFilename = `${uuidv4()}.epub`;
  const outputPath = path.join(OUTPUT_DIR, outputFilename);

  if (epubGenFn) {
    await generateWithLibrary(chapters, outputPath, { title, author, genre, description, language, coverImagePath, publisherName });
  } else {
    await generateMinimalEpub(chapters, outputPath, { title, author, description, language });
  }

  return {
    filename: outputFilename,
    outputPath,
    fileSize: fs.statSync(outputPath).size,
    chapters: chapters.length,
    title,
    author,
  };
}

async function generateWithLibrary(chapters, outputPath, meta) {
  const { title, author, genre, description, language, coverImagePath, publisherName } = meta;

  const epubOptions = {
    title,
    author,
    publisher: publisherName || `${author} 독립출판`,
    description: description || "",
    lang: language || "ko",
    content: chapters,
    css: getEpubStylesheet(),
  };

  if (genre) epubOptions.subject = genre;
  if (coverImagePath && fs.existsSync(coverImagePath)) {
    epubOptions.cover = coverImagePath;
  }

  // epub-gen-memory v1: epubGenFn(options) → Buffer
  const buffer = await epubGenFn(epubOptions);
  fs.writeFileSync(outputPath, Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer));
}

// epub-gen-memory 없을 때 최소 EPUB 생성 (수동 ZIP 구성)
async function generateMinimalEpub(chapters, outputPath, meta) {
  const archiver = require("archiver");
  const { title, author, description = "", language = "ko" } = meta;
  const bookId = uuidv4();

  const output = fs.createWriteStream(outputPath);
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(output);

  // mimetype (압축 없이 첫번째)
  archive.append("application/epub+zip", { name: "mimetype", store: true });

  // container.xml
  archive.append(`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`, { name: "META-INF/container.xml" });

  // content.opf
  const manifestItems = chapters.map((_, i) =>
    `<item id="chap${i}" href="chapter${i}.html" media-type="application/xhtml+xml"/>`
  ).join("\n    ");
  const spineItems = chapters.map((_, i) => `<itemref idref="chap${i}"/>`).join("\n    ");

  archive.append(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator>${escapeXml(author)}</dc:creator>
    <dc:language>${language}</dc:language>
    <dc:description>${escapeXml(description)}</dc:description>
    <dc:identifier id="bookid">urn:uuid:${bookId}</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
    ${manifestItems}
  </manifest>
  <spine toc="ncx">${spineItems}</spine>
</package>`, { name: "OEBPS/content.opf" });

  // toc.ncx
  const navPoints = chapters.map((ch, i) => `
  <navPoint id="nav${i}" playOrder="${i + 1}">
    <navLabel><text>${escapeXml(ch.title)}</text></navLabel>
    <content src="chapter${i}.html"/>
  </navPoint>`).join("");

  archive.append(`<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="urn:uuid:${bookId}"/></head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <navMap>${navPoints}</navMap>
</ncx>`, { name: "OEBPS/toc.ncx" });

  // CSS
  archive.append(getEpubStylesheet(), { name: "OEBPS/style.css" });

  // 챕터 HTML 파일들
  chapters.forEach((ch, i) => {
    archive.append(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${language}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
  <title>${escapeXml(ch.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
${ch.data}
</body>
</html>`, { name: `OEBPS/chapter${i}.html` });
  });

  await new Promise((resolve, reject) => {
    output.on("close", resolve);
    archive.on("error", reject);
    archive.finalize();
  });
}

function escapeXml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── EPUB 스타일시트 ──────────────────────────────────────────

function getEpubStylesheet() {
  return `
body {
  font-family: "Noto Serif KR", "Nanum Myeongjo", Georgia, "Times New Roman", serif;
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
h2 { font-size: 1.4em; margin: 1.5em 0 0.8em; font-weight: bold; }
h3 { font-size: 1.2em; margin: 1.2em 0 0.6em; }
p  { margin: 0.8em 0; text-align: justify; text-indent: 1em; }
p.poetry {
  text-align: center; text-indent: 0;
  font-style: italic; margin: 1.5em 2em; line-height: 2.2;
}
blockquote {
  margin: 1em 2em; padding: 0.5em 1em;
  border-left: 3px solid #666; font-style: italic;
}
img { max-width: 100%; height: auto; display: block; margin: 1em auto; }
`.trim();
}

// ─── 유틸리티 ─────────────────────────────────────────────────

function cleanupFile(filePath) {
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }
  catch (e) { console.error("파일 정리 실패:", e.message); }
}

module.exports = { generateEpub, extractTextFromFile, cleanupFile };
