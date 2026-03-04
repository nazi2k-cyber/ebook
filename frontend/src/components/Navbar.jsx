import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { BookOpen, Wallet, ChevronDown, LogOut, Menu, X, Zap } from "lucide-react";
import { useWeb3 } from "../context/Web3Context";

export default function Navbar() {
  const { account, balance, networkName, isConnecting, connectWallet, disconnectWallet, isWrongNetwork } = useWeb3();
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const shortAddress = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : null;

  const navLinks = [
    { to: "/", label: "홈" },
    { to: "/publish", label: "출판하기" },
    { to: "/marketplace", label: "NFT 거래소" },
    { to: "/library", label: "내 서재" },
  ];

  return (
    <nav className="navbar">
      <div className="nav-inner container">
        {/* 로고 */}
        <Link to="/" className="nav-logo">
          <BookOpen size={28} className="logo-icon" />
          <span className="logo-text">Book<span className="logo-accent">Chain</span></span>
        </Link>

        {/* 데스크탑 링크 */}
        <div className="nav-links">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              end={to === "/"}
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* 지갑 버튼 */}
        <div className="nav-wallet">
          {isWrongNetwork && (
            <span className="badge badge-warning" style={{ fontSize: "0.75rem" }}>
              ⚠ 지원하지 않는 네트워크
            </span>
          )}

          {account ? (
            <div className="wallet-dropdown">
              <button
                className="wallet-btn connected"
                onClick={() => setShowWalletMenu(!showWalletMenu)}
              >
                <span className="wallet-dot" />
                <span className="wallet-address">{shortAddress}</span>
                <ChevronDown size={14} />
              </button>

              {showWalletMenu && (
                <div className="wallet-menu">
                  <div className="wallet-info">
                    <Zap size={14} className="wallet-info-icon" />
                    <span className="wallet-network">{networkName}</span>
                  </div>
                  <div className="wallet-balance">
                    {parseFloat(balance).toFixed(4)} ETH
                  </div>
                  <div className="wallet-full-address">{account}</div>
                  <button
                    className="wallet-disconnect"
                    onClick={() => { disconnectWallet(); setShowWalletMenu(false); }}
                  >
                    <LogOut size={14} />
                    연결 해제
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="btn btn-primary wallet-connect-btn"
              onClick={connectWallet}
              disabled={isConnecting}
            >
              <Wallet size={16} />
              {isConnecting ? "연결 중..." : "지갑 연결"}
            </button>
          )}

          {/* 모바일 메뉴 토글 */}
          <button
            className="mobile-menu-btn"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {showMobileMenu && (
        <div className="mobile-menu">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}
              onClick={() => setShowMobileMenu(false)}
              end={to === "/"}
            >
              {label}
            </NavLink>
          ))}
          {!account && (
            <button className="btn btn-primary" onClick={connectWallet} style={{ width: "100%" }}>
              <Wallet size={16} /> 지갑 연결
            </button>
          )}
        </div>
      )}

      <style>{`
        .navbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(15, 14, 23, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(99, 102, 241, 0.2);
        }
        .nav-inner {
          display: flex;
          align-items: center;
          gap: 32px;
          height: 64px;
        }
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          flex-shrink: 0;
        }
        .logo-icon { color: #6366f1; }
        .logo-text {
          font-size: 1.3rem;
          font-weight: 700;
          color: #e0e7ff;
          font-family: var(--font-sans);
        }
        .logo-accent { color: #6366f1; }
        .nav-links {
          display: flex;
          gap: 4px;
          flex: 1;
        }
        .nav-link {
          padding: 8px 16px;
          border-radius: 8px;
          color: #a5b4fc;
          font-size: 0.95rem;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.2s;
        }
        .nav-link:hover { background: rgba(99,102,241,0.1); color: #e0e7ff; }
        .nav-link.active { background: rgba(99,102,241,0.2); color: #e0e7ff; }
        .nav-wallet {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-left: auto;
        }
        .wallet-connect-btn { padding: 8px 18px; font-size: 0.9rem; }
        .wallet-dropdown { position: relative; }
        .wallet-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: rgba(99,102,241,0.15);
          border: 1px solid rgba(99,102,241,0.4);
          border-radius: 10px;
          color: #a5b4fc;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .wallet-btn:hover { background: rgba(99,102,241,0.25); }
        .wallet-dot {
          width: 8px; height: 8px;
          background: #10b981;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .wallet-address { font-family: monospace; font-size: 0.85rem; }
        .wallet-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: #1e1b4b;
          border: 1px solid rgba(99,102,241,0.3);
          border-radius: 14px;
          padding: 16px;
          min-width: 240px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          z-index: 50;
        }
        .wallet-info {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #10b981;
          font-size: 0.8rem;
          margin-bottom: 8px;
        }
        .wallet-balance {
          font-size: 1.2rem;
          font-weight: 700;
          color: #e0e7ff;
          margin-bottom: 8px;
        }
        .wallet-full-address {
          font-family: monospace;
          font-size: 0.72rem;
          color: #6b7280;
          word-break: break-all;
          margin-bottom: 12px;
        }
        .wallet-disconnect {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 12px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 8px;
          color: #f87171;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background 0.2s;
        }
        .wallet-disconnect:hover { background: rgba(239,68,68,0.2); }
        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          color: #a5b4fc;
          cursor: pointer;
          padding: 4px;
        }
        .mobile-menu {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px 20px 16px;
          border-top: 1px solid rgba(99,102,241,0.2);
          background: rgba(15, 14, 23, 0.97);
        }
        .mobile-nav-link {
          padding: 12px 16px;
          border-radius: 10px;
          color: #a5b4fc;
          font-size: 1rem;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.2s;
        }
        .mobile-nav-link.active, .mobile-nav-link:hover {
          background: rgba(99,102,241,0.15);
          color: #e0e7ff;
        }
        @media (max-width: 768px) {
          .nav-links { display: none; }
          .wallet-connect-btn { display: none; }
          .mobile-menu-btn { display: flex; }
        }
      `}</style>
    </nav>
  );
}
