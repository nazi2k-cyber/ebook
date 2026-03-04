import React from "react";
import { Routes, Route } from "react-router-dom";
import { Web3Provider } from "./context/Web3Context";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Publish from "./pages/Publish";
import Marketplace from "./pages/Marketplace";
import Library from "./pages/Library";

function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid rgba(99,102,241,0.2)",
      padding: "32px 0",
      textAlign: "center",
      color: "#6b7280",
      fontSize: "0.85rem",
    }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px" }}>
        <p style={{ marginBottom: "8px" }}>
          <strong style={{ color: "#a5b4fc" }}>BookChain</strong> — 블록체인 기반 1인 독립출판 플랫폼
        </p>
        <p>ERC-721 NFT · IPFS · EIP-2981 로열티 · epub 변환 엔진</p>
        <div style={{ marginTop: "16px", display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap" }}>
          <span>📚 문서 → epub 자동 변환</span>
          <span>🔗 블록체인 저작권 등록</span>
          <span>💰 스마트 로열티 지급</span>
          <span>📖 내장 ebook 리더</span>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <Web3Provider>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 64px)" }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/publish" element={<Publish />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/library" element={<Library />} />
          <Route path="*" element={
            <div style={{ textAlign: "center", padding: "100px 24px", color: "#9ca3af" }}>
              <h1 style={{ fontSize: "4rem", marginBottom: "16px" }}>404</h1>
              <p>페이지를 찾을 수 없습니다.</p>
            </div>
          } />
        </Routes>
      </main>
      <Footer />
    </Web3Provider>
  );
}
