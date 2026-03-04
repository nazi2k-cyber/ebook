const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const ebookRoutes = require("./routes/ebook");
const uploadRoutes = require("./routes/upload");
const ipfsRoutes = require("./routes/ipfs");
const healthRoutes = require("./routes/health");

const app = express();
const PORT = process.env.PORT || 3001;

// 디렉토리 보장
const EPUB_DIR = path.join(__dirname, "../../epub-output");
const UPLOAD_DIR = path.join(__dirname, "../../uploads");
[EPUB_DIR, UPLOAD_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// 보안 미들웨어
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error("CORS 정책 위반"));
  },
  credentials: true,
}));

// Rate limiting
app.use("/api/", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "요청이 너무 많습니다. 잠시 후 다시 시도하세요." },
}));

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 정적 파일 제공
app.use("/epub", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
}, express.static(EPUB_DIR, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".epub")) {
      res.setHeader("Content-Type", "application/epub+zip");
      res.setHeader("Content-Disposition", "inline");
    }
  },
}));

app.use("/uploads", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
}, express.static(UPLOAD_DIR));

// API 라우트
app.use("/api/health", healthRoutes);
app.use("/api/ebook", ebookRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ipfs", ipfsRoutes);

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error("서버 오류:", err.message);
  res.status(err.status || 500).json({
    error: err.message || "내부 서버 오류",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 BookChain API 서버 실행 중`);
  console.log(`   포트     : ${PORT}`);
  console.log(`   환경     : ${process.env.NODE_ENV || "development"}`);
  console.log(`   EPUB 출력 : ${EPUB_DIR}`);
  console.log(`   업로드    : ${UPLOAD_DIR}`);
  console.log(`   URL       : http://localhost:${PORT}\n`);
});

module.exports = app;
