const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, "../../../uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = [
  "text/plain",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/html",
  "text/markdown",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const ALLOWED_EXTENSIONS = [".txt", ".pdf", ".doc", ".docx", ".html", ".htm", ".md", ".jpg", ".jpeg", ".png", ".webp"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, uuidv4());
    fs.mkdirSync(dir, { recursive: true });
    req.uploadDir = dir;
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${uuidv4()}${ext}`;
    cb(null, safeName);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIME_TYPES.includes(file.mimetype) || ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`지원하지 않는 파일 형식: ${ext}. 허용된 형식: ${ALLOWED_EXTENSIONS.join(", ")}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 2,
  },
});

// 문서 파일 업로드
router.post("/document", upload.single("document"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "파일이 없습니다." });
  }

  res.json({
    success: true,
    file: {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadDir: req.uploadDir,
    },
  });
});

// 표지 이미지 업로드
router.post("/cover", upload.single("cover"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "이미지 파일이 없습니다." });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  const isImage = [".jpg", ".jpeg", ".png", ".webp"].includes(ext);
  if (!isImage) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "이미지 파일만 허용됩니다 (JPG, PNG, WebP)." });
  }

  res.json({
    success: true,
    cover: {
      filename: req.file.filename,
      path: req.file.path,
      url: `/uploads/${path.relative(UPLOAD_DIR, req.file.path)}`,
    },
  });
});

// 업로드 에러 핸들러
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "파일 크기가 50MB를 초과합니다." });
    }
    return res.status(400).json({ error: `파일 업로드 오류: ${err.message}` });
  }
  next(err);
});

module.exports = router;
