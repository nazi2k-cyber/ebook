/**
 * 클라이언트사이드 EPUB 생성기 (GitHub Pages / 백엔드 없이 동작)
 * JSZip으로 EPUB3 구조를 직접 생성
 */
import JSZip from "jszip";

// ─── 텍스트 추출 ────────────────────────────────────────────────

/**
 * File 객체에서 텍스트/HTML 추출
 */
export async function extractFromFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();

  if (ext === "txt") {
    const text = await readAsText(file);
    return { text, html: textToHtml(text) };
  }

  if (ext === "md") {
    const text = await readAsText(file);
    return { text, html: markdownToHtml(text) };
  }

  if (ext === "docx") {
    try {
      const mammoth = await import("mammoth");
      const arrayBuffer = await file.arrayBuffer();
      const [htmlResult, textResult] = await Promise.all([
        mammoth.convertToHtml({ arrayBuffer }),
        mammoth.extractRawText({ arrayBuffer }),
      ]);
      return { text: textResult.value, html: htmlResult.value || textToHtml(textResult.value) };
    } catch (e) {
      throw new Error(`DOCX 변환 실패: ${e.message}`);
    }
  }

  if (ext === "pdf") {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      // PDF.js worker 설정 (버전 고정으로 CDN 매칭 보장)
      const ver = pdfjsLib.version || "4.0.379";
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${ver}/pdf.worker.min.js`;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(item => item.str).join(" ") + "\n\n";
      }
      return { text: fullText, html: textToHtml(fullText) };
    } catch (e) {
      throw new Error(`PDF 파싱 실패: ${e.message}. (PDF → TXT 변환 후 재시도 권장)`);
    }
  }

  if (ext === "html" || ext === "htm") {
    const text = await readAsText(file);
    const stripped = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return { text: stripped, html: text };
  }

  throw new Error(`지원하지 않는 형식: .${ext} (지원: TXT·MD·DOCX·PDF·HTML)`);
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsText(file, "utf-8");
  });
}

// ─── 텍스트 → HTML 변환 ────────────────────────────────────────

export function textToHtml(text) {
  if (!text?.trim()) return "<p>(내용 없음)</p>";
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

export function markdownToHtml(md) {
  const lines = md.split("\n");
  const out = [];
  let paraBuf = [];
  const flush = () => { if (paraBuf.length) { out.push(`<p>${paraBuf.join(" ")}</p>`); paraBuf = []; } };
  for (const line of lines) {
    if (/^# /.test(line))        { flush(); out.push(`<h1>${esc(line.slice(2))}</h1>`); }
    else if (/^## /.test(line))  { flush(); out.push(`<h2>${esc(line.slice(3))}</h2>`); }
    else if (/^### /.test(line)) { flush(); out.push(`<h3>${esc(line.slice(4))}</h3>`); }
    else if (!line.trim())       { flush(); }
    else { paraBuf.push(line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>")); }
  }
  flush();
  return out.join("\n");
}

function esc(s) { return s?.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;") ?? ""; }

// ─── 챕터 분할 ────────────────────────────────────────────────

function splitChapters(html, title) {
  const parts = html.split(/(<h[12][^>]*>.*?<\/h[12]>)/i);
  if (parts.length <= 1) return [{ title, data: html }];
  const chapters = [];
  if (parts[0].trim()) chapters.push({ title: "서문", data: parts[0] });
  for (let i = 1; i < parts.length - 1; i += 2) {
    const headText = parts[i].replace(/<[^>]+>/g, "").trim();
    chapters.push({ title: headText, data: `${parts[i]}${parts[i + 1] || ""}` });
  }
  return chapters.length > 0 ? chapters : [{ title, data: html }];
}

// ─── EPUB 스타일시트 ──────────────────────────────────────────

const CSS = `
body{font-family:"Noto Serif KR",Georgia,serif;font-size:1em;line-height:1.8;margin:0 5%;color:#1a1a1a;}
h1{font-size:1.8em;text-align:center;margin:2em 0 1em;font-weight:bold;border-bottom:2px solid #333;padding-bottom:.5em;}
h2{font-size:1.4em;margin:1.5em 0 .8em;font-weight:bold;}
h3{font-size:1.2em;margin:1.2em 0 .6em;}
p{margin:.8em 0;text-align:justify;text-indent:1em;}
p.poetry{text-align:center;text-indent:0;font-style:italic;margin:1.5em 2em;line-height:2.2;}
blockquote{margin:1em 2em;padding:.5em 1em;border-left:3px solid #666;font-style:italic;}
img{max-width:100%;height:auto;display:block;margin:1em auto;}
`.trim();

// ─── EPUB 생성 메인 함수 ──────────────────────────────────────

/**
 * @param {File} file - 원본 문서 파일
 * @param {object} meta - { title, author, genre, description, language, coverFile }
 * @returns {Promise<{ blob: Blob, filename: string, chapters: number }>}
 */
export async function generateEpubClient(file, meta) {
  const { title, author, genre = "", description = "", language = "ko", coverFile } = meta;

  // 1. 텍스트 추출
  const { html } = await extractFromFile(file);

  // 2. 챕터 분할
  const chapters = splitChapters(html, title);

  // 3. JSZip으로 EPUB 구조 생성
  const zip = new JSZip();
  const bookId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);

  // mimetype (압축 없음)
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  // META-INF/container.xml
  zip.folder("META-INF").file("container.xml", `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  const oebps = zip.folder("OEBPS");

  // CSS
  oebps.file("style.css", CSS);

  // 표지 이미지 처리
  let coverItem = "";
  let coverMeta = "";
  if (coverFile) {
    try {
      const coverBuf = await coverFile.arrayBuffer();
      const coverExt = coverFile.name.split(".").pop().toLowerCase();
      const coverMime = coverExt === "png" ? "image/png" : "image/jpeg";
      oebps.file(`cover.${coverExt}`, coverBuf);
      coverItem = `<item id="cover-img" href="cover.${coverExt}" media-type="${coverMime}" properties="cover-image"/>`;
      coverMeta = `<meta name="cover" content="cover-img"/>`;
    } catch { /* 표지 실패해도 계속 */ }
  }

  // 챕터 HTML 파일
  const manifestChaps = chapters.map((_, i) =>
    `<item id="c${i}" href="chapter${i}.xhtml" media-type="application/xhtml+xml"/>`
  ).join("\n    ");
  const spineChaps = chapters.map((_, i) => `<itemref idref="c${i}"/>`).join("\n    ");

  chapters.forEach((ch, i) => {
    oebps.file(`chapter${i}.xhtml`, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${language}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
  <title>${esc(ch.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
${ch.data}
</body>
</html>`);
  });

  // content.opf
  oebps.file("content.opf", `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${esc(title)}</dc:title>
    <dc:creator opf:role="aut">${esc(author)}</dc:creator>
    <dc:language>${language}</dc:language>
    <dc:subject>${esc(genre)}</dc:subject>
    <dc:description>${esc(description)}</dc:description>
    <dc:identifier id="bookid">urn:uuid:${bookId}</dc:identifier>
    <dc:rights>Copyright © ${new Date().getFullYear()} ${esc(author)}</dc:rights>
    ${coverMeta}
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
    ${coverItem}
    ${manifestChaps}
  </manifest>
  <spine toc="ncx">
    ${spineChaps}
  </spine>
</package>`);

  // toc.ncx
  const navPoints = chapters.map((ch, i) => `
  <navPoint id="nav${i}" playOrder="${i + 1}">
    <navLabel><text>${esc(ch.title)}</text></navLabel>
    <content src="chapter${i}.xhtml"/>
  </navPoint>`).join("");

  oebps.file("toc.ncx", `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${bookId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${esc(title)}</text></docTitle>
  <navMap>${navPoints}
  </navMap>
</ncx>`);

  // 4. ZIP → Blob
  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/epub+zip",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const filename = `${title.replace(/[^가-힣a-zA-Z0-9]/g, "_")}.epub`;

  return { blob, filename, chapters: chapters.length };
}
