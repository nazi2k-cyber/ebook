const express = require("express");
const fs = require("fs");
const path = require("path");
const { generateEpub, cleanupFile } = require("../services/epubGenerator");

const router = express.Router();

/**
 * POST /api/ebook/generate
 * 업로드된 파일에서 EPUB 생성
 */
router.post("/generate", async (req, res) => {
  const {
    filePath,
    mimeType,
    title,
    author,
    genre,
    description,
    language,
    coverImagePath,
    publisherName,
  } = req.body;

  // 유효성 검사
  if (!filePath || !title || !author) {
    return res.status(400).json({
      error: "필수 항목 누락: filePath, title, author",
    });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "업로드된 파일을 찾을 수 없습니다." });
  }

  // 경로 순회 공격 방지
  const uploadsDir = path.resolve(__dirname, "../../../uploads");
  const resolvedFilePath = path.resolve(filePath);
  if (!resolvedFilePath.startsWith(uploadsDir)) {
    return res.status(403).json({ error: "접근 거부" });
  }

  try {
    console.log(`📚 EPUB 생성 시작: "${title}" by ${author}`);

    const result = await generateEpub({
      filePath: resolvedFilePath,
      mimeType: mimeType || "text/plain",
      title,
      author,
      genre: genre || "",
      description: description || "",
      language: language || "ko",
      coverImagePath: coverImagePath || null,
      publisherName: publisherName || `${author} 독립출판`,
    });

    console.log(`✅ EPUB 생성 완료: ${result.filename} (${(result.fileSize / 1024).toFixed(1)}KB)`);

    res.json({
      success: true,
      epub: {
        filename: result.filename,
        downloadUrl: `/epub/${result.filename}`,
        fileSize: result.fileSize,
        chapters: result.chapters,
        metadata: {
          title,
          author,
          genre,
          language,
          generatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    console.error("EPUB 생성 실패:", err.message);
    res.status(500).json({ error: `EPUB 생성 실패: ${err.message}` });
  }
});

/**
 * GET /api/ebook/download/:filename
 * EPUB 파일 다운로드
 */
router.get("/download/:filename", (req, res) => {
  const { filename } = req.params;

  // 파일명 보안 검사
  if (!/^[a-f0-9-]+\.epub$/.test(filename)) {
    return res.status(400).json({ error: "잘못된 파일명" });
  }

  const outputDir = path.join(__dirname, "../../../epub-output");
  const filePath = path.join(outputDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "파일을 찾을 수 없습니다." });
  }

  res.download(filePath, `ebook-${Date.now()}.epub`);
});

/**
 * POST /api/ebook/preview
 * 문서에서 텍스트 미리보기 추출
 */
router.post("/preview", async (req, res) => {
  const { filePath, mimeType } = req.body;

  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(400).json({ error: "파일 경로가 잘못되었습니다." });
  }

  const uploadsDir = path.resolve(__dirname, "../../../uploads");
  if (!path.resolve(filePath).startsWith(uploadsDir)) {
    return res.status(403).json({ error: "접근 거부" });
  }

  try {
    const { extractTextFromFile } = require("../services/epubGenerator");
    const { text } = await extractTextFromFile(filePath, mimeType);
    const preview = text.substring(0, 500) + (text.length > 500 ? "..." : "");

    res.json({
      success: true,
      preview,
      totalLength: text.length,
      estimatedPages: Math.ceil(text.length / 2000),
    });
  } catch (err) {
    res.status(500).json({ error: `미리보기 실패: ${err.message}` });
  }
});

/**
 * DELETE /api/ebook/cleanup
 * 임시 파일 정리
 */
router.delete("/cleanup", (req, res) => {
  const { filePaths } = req.body;
  if (!Array.isArray(filePaths)) {
    return res.status(400).json({ error: "filePaths 배열이 필요합니다." });
  }

  const uploadsDir = path.resolve(__dirname, "../../../uploads");
  filePaths.forEach(filePath => {
    const resolved = path.resolve(filePath);
    if (resolved.startsWith(uploadsDir)) {
      cleanupFile(resolved);
    }
  });

  res.json({ success: true });
});

module.exports = router;
