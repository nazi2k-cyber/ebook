# 📚 BookChain — 블록체인 기반 1인 독립출판 플랫폼

> 창작문(시, 소설, 수필 등)을 **epub**으로 자동 변환하고, **NFT**로 저작권을 블록체인에 등록하여 탈중앙 거래소에서 직접 판매하는 풀스택 플랫폼

---

## 🌟 핵심 기능

| 기능 | 설명 |
|------|------|
| 📄 **문서 → EPUB 변환** | TXT, DOCX, PDF, MD → epub 자동 변환 |
| 🔗 **NFT 저작권 등록** | ERC-721 NFT로 블록체인에 영구 기록 |
| 💰 **자동 로열티 지급** | EIP-2981: 재판매 시 저자에게 자동 수수료 |
| 🌐 **IPFS 분산 저장** | Pinata를 통한 epub 파일 영구 보관 |
| 🏪 **NFT 거래소** | 고정가 판매 + 경매 방식 지원 |
| 📖 **내장 ebook 리더** | 다크/라이트/세피아 테마, 폰트 조절 |
| 🔒 **중복 등록 방지** | 콘텐츠 해시로 표절/중복 차단 |
| 📱 **반응형 UI** | 모바일 최적화 |

---

## 🏗️ 기술 스택

### 프론트엔드
- **React 18** + Vite
- **ethers.js v6** — 블록체인 연동
- **epub.js** — ebook 리더
- **framer-motion** — 애니메이션
- **Zustand / React Query** — 상태 관리
- **react-dropzone** — 파일 업로드 UX

### 백엔드
- **Node.js** + Express
- **mammoth** — DOCX → HTML 변환
- **pdf-parse** — PDF 텍스트 추출
- **epub-gen-memory** — EPUB 생성
- **multer** — 파일 업로드
- **Pinata SDK** — IPFS 업로드

### 블록체인
- **Solidity 0.8.24**
- **Hardhat** — 개발/테스트 환경
- **OpenZeppelin** — ERC-721, ERC-2981, ReentrancyGuard
- 지원 네트워크: Hardhat 로컬, Sepolia, Polygon Mumbai

### 스마트 컨트랙트 아키텍처
```
EbookNFT (ERC-721)
├── ERC721URIStorage   — IPFS 메타데이터 URI
├── ERC721Royalty      — EIP-2981 로열티 표준
└── Ownable            — 플랫폼 관리

EbookMarketplace
├── ReentrancyGuard    — 재진입 공격 방지
├── 고정가 판매         — listForSale, buyNow
├── 경매               — createAuction, placeBid, finalizeAuction
└── 자동 로열티 분배    — _processSale
```

---

## 🚀 빠른 시작

### 1. 클론 및 환경변수 설정
```bash
git clone <repo-url>
cd ebook-nft-platform

# 환경변수 설정
cp .env.example .env
# .env 파일에 Pinata API 키, 지갑 개인키 등 입력
```

### 2. 로컬 블록체인 실행 및 컨트랙트 배포
```bash
cd contracts
npm install

# 로컬 블록체인 노드 실행 (별도 터미널)
npx hardhat node

# 컨트랙트 배포
npx hardhat run scripts/deploy.js --network localhost
```

> 배포 후 출력되는 컨트랙트 주소를 `.env`의 `VITE_NFT_ADDRESS`, `VITE_MARKETPLACE_ADDRESS`에 입력

### 3. 백엔드 실행
```bash
cd backend
npm install
npm run dev
# → http://localhost:3001
```

### 4. 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### 5. MetaMask 설정
- MetaMask에서 "네트워크 추가" → RPC: `http://127.0.0.1:8545`, Chain ID: `31337`
- Hardhat 노드가 제공하는 테스트 계정 Private Key 임포트

---

## 📁 프로젝트 구조

```
ebook-nft-platform/
├── contracts/                  # 스마트 컨트랙트
│   ├── contracts/
│   │   ├── EbookNFT.sol        # ERC-721 NFT 컨트랙트
│   │   └── EbookMarketplace.sol # NFT 거래소 컨트랙트
│   ├── scripts/deploy.js       # 배포 스크립트
│   ├── test/EbookNFT.test.js   # 테스트
│   └── hardhat.config.js
│
├── backend/                    # Express API 서버
│   └── src/
│       ├── routes/
│       │   ├── ebook.js        # EPUB 생성 API
│       │   ├── upload.js       # 파일 업로드 API
│       │   └── ipfs.js         # IPFS 업로드 API
│       └── services/
│           └── epubGenerator.js # 문서 변환 엔진
│
├── frontend/                   # React 앱
│   └── src/
│       ├── context/
│       │   └── Web3Context.jsx  # 지갑 연결, 컨트랙트
│       ├── components/
│       │   ├── EbookReader.jsx  # epub.js 리더
│       │   ├── NFTCard.jsx      # NFT 카드 컴포넌트
│       │   └── Navbar.jsx
│       └── pages/
│           ├── Home.jsx         # 랜딩 페이지
│           ├── Publish.jsx      # 출판 플로우 (5단계)
│           ├── Marketplace.jsx  # NFT 거래소
│           └── Library.jsx      # 내 서재
│
├── uploads/                    # 임시 업로드 파일
├── epub-output/                # 생성된 epub 파일
└── .env.example
```

---

## 💡 출판 플로우

```
1. 문서 업로드 (.txt/.docx/.pdf/.md)
         ↓
2. 도서 정보 입력 (제목, 저자, 장르, 로열티%)
         ↓
3. EPUB 자동 생성 (챕터 분리, 한국어 폰트, 목차)
         ↓
4. IPFS 업로드 (epub + ERC-721 메타데이터 JSON)
         ↓
5. NFT 발행 → 블록체인 저작권 등록 완료
         ↓
6. NFT 거래소에서 판매 또는 경매
```

---

## 🔐 스마트 컨트랙트 보안

- **ReentrancyGuard** — 재진입 공격 방지 (Pull over Push 패턴)
- **콘텐츠 해시 검증** — `registeredContent` 매핑으로 중복 등록 방지
- **경로 순회 방지** — 백엔드에서 `path.resolve()` 검증
- **파일 타입 검증** — MIME 타입 + 확장자 이중 검증
- **파일 크기 제한** — 업로드 최대 50MB
- **Rate Limiting** — API 요청 15분당 100회 제한

---

## 🧪 스마트 컨트랙트 테스트

```bash
cd contracts
npx hardhat test
```

테스트 항목:
- NFT 발행 및 메타데이터 저장
- 중복 발행 방지
- EIP-2981 로열티 계산
- 마켓플레이스 고정가 구매
- 경매 입찰 및 낙찰
- 플랫폼 수수료 분배

---

## 🔑 API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| `POST` | `/api/upload/document` | 문서 파일 업로드 |
| `POST` | `/api/upload/cover` | 표지 이미지 업로드 |
| `POST` | `/api/ebook/generate` | EPUB 생성 |
| `GET`  | `/api/ebook/download/:filename` | EPUB 다운로드 |
| `POST` | `/api/ebook/preview` | 텍스트 미리보기 |
| `POST` | `/api/ipfs/upload-epub` | EPUB → IPFS |
| `POST` | `/api/ipfs/upload-metadata` | NFT 메타데이터 → IPFS |
| `GET`  | `/api/health` | 서버 상태 확인 |

---

## 📜 라이선스

MIT License — 개인 및 상업적 사용 가능
