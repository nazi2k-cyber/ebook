#!/bin/bash
# BookChain 개발 환경 셋업 스크립트

set -e
echo "🚀 BookChain 개발 환경 설치 중..."

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# 디렉토리 생성
mkdir -p uploads epub-output

# 백엔드 의존성
echo "📦 백엔드 패키지 설치 중..."
cd "$ROOT_DIR/backend"
npm install

# 프론트엔드 의존성
echo "📦 프론트엔드 패키지 설치 중..."
cd "$ROOT_DIR/frontend"
npm install

# 컨트랙트 의존성 (선택)
if [ -f "$ROOT_DIR/contracts/package.json" ]; then
  echo "📦 컨트랙트 패키지 설치 중..."
  cd "$ROOT_DIR/contracts"
  npm install
fi

echo ""
echo "✅ 설치 완료!"
echo ""
echo "📌 실행 방법:"
echo "   터미널 1: cd backend && npm run dev   (API 서버, 포트 3001)"
echo "   터미널 2: cd frontend && npm run dev  (React 앱, 포트 5173)"
echo ""
echo "📌 블록체인 (선택):"
echo "   터미널 3: cd contracts && npx hardhat node"
echo "   터미널 4: cd contracts && npx hardhat run scripts/deploy.js --network localhost"
echo ""
echo "🌐 브라우저: http://localhost:5173"
