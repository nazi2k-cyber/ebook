const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config({ path: "../../.env" });

const ebookRoutes = require("./routes/ebook");
const uploadRoutes = require("./routes/upload");
const ipfsRoutes = require("./routes/ipfs");
const healthRoutes = require("./routes/health");

const app = express();
const PORT = process.env.PORT || 3001;

// 보안 미들웨어
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

// 요청 제한
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100,
  message: { error: "너무 많은 요청입니다. 잠시 후 다시 시도하세요." },
});
app.use("/api/", limiter);

app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 정적 파일 제공 (생성된 epub)
app.use("/epub", express.static(path.join(__dirname, "../../epub-output")));
app.use("/uploads", express.static(path.join(__dirname, "../../uploads")));

// API 라우트
app.use("/api/health", healthRoutes);
app.use("/api/ebook", ebookRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ipfs", ipfsRoutes);

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error("서버 오류:", err.stack);
  res.status(err.status || 500).json({
    error: err.message || "내부 서버 오류",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Ebook Platform API 서버 실행 중`);
  console.log(`   포트: ${PORT}`);
  console.log(`   환경: ${process.env.NODE_ENV || "development"}`);
  console.log(`   URL: http://localhost:${PORT}`);
});

module.exports = app;
