const express = require("express");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud";

/**
 * EPUB 파일을 IPFS(Pinata)에 업로드
 * POST /api/ipfs/upload-epub
 */
router.post("/upload-epub", async (req, res) => {
  const { filename, title, author } = req.body;

  if (!filename || !/^[a-f0-9-]+\.epub$/.test(filename)) {
    return res.status(400).json({ error: "잘못된 파일명" });
  }

  const epubPath = path.join(__dirname, "../../../epub-output", filename);
  if (!fs.existsSync(epubPath)) {
    return res.status(404).json({ error: "EPUB 파일을 찾을 수 없습니다." });
  }

  // Pinata API 키가 없으면 모의 응답 반환 (개발 환경)
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    const mockHash = `Qm${Math.random().toString(36).substr(2, 44)}`;
    console.log("⚠️  Pinata API 키 없음 - 모의 IPFS 해시 반환:", mockHash);
    return res.json({
      success: true,
      ipfsHash: mockHash,
      ipfsUrl: `${PINATA_GATEWAY}/ipfs/${mockHash}`,
      isDemoMode: true,
    });
  }

  try {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(epubPath), {
      filename: `${title || "ebook"}.epub`,
      contentType: "application/epub+zip",
    });

    formData.append("pinataMetadata", JSON.stringify({
      name: `${title} by ${author}`,
      keyvalues: { author, title, type: "ebook" },
    }));

    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    res.json({
      success: true,
      ipfsHash: response.data.IpfsHash,
      ipfsUrl: `${PINATA_GATEWAY}/ipfs/${response.data.IpfsHash}`,
      pinSize: response.data.PinSize,
    });
  } catch (err) {
    console.error("IPFS 업로드 실패:", err.response?.data || err.message);
    res.status(500).json({ error: `IPFS 업로드 실패: ${err.message}` });
  }
});

/**
 * NFT 메타데이터 JSON을 IPFS에 업로드
 * POST /api/ipfs/upload-metadata
 */
router.post("/upload-metadata", async (req, res) => {
  const { metadata } = req.body;
  if (!metadata) {
    return res.status(400).json({ error: "메타데이터가 필요합니다." });
  }

  // ERC721 메타데이터 표준 형식
  const nftMetadata = {
    name: metadata.title,
    description: metadata.description || `${metadata.title} by ${metadata.author}`,
    image: metadata.coverIpfsUrl || "",
    external_url: metadata.externalUrl || "",
    attributes: [
      { trait_type: "Author", value: metadata.author },
      { trait_type: "Genre", value: metadata.genre || "General" },
      { trait_type: "Language", value: metadata.language || "Korean" },
      { trait_type: "Publisher", value: metadata.publisher || `${metadata.author} 독립출판` },
      { trait_type: "Published Date", value: new Date().toISOString().split("T")[0] },
      { trait_type: "Edition", value: metadata.edition || "Standard" },
      { trait_type: "Total Editions", value: metadata.totalEditions || "Unlimited" },
    ],
    epub_ipfs_hash: metadata.epubIpfsHash || "",
    content_type: "ebook/epub",
  };

  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    const mockHash = `Qm${Math.random().toString(36).substr(2, 44)}`;
    return res.json({
      success: true,
      ipfsHash: mockHash,
      metadataUrl: `${PINATA_GATEWAY}/ipfs/${mockHash}`,
      isDemoMode: true,
      metadata: nftMetadata,
    });
  }

  try {
    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      { pinataContent: nftMetadata, pinataMetadata: { name: `${metadata.title}-metadata.json` } },
      {
        headers: {
          "Content-Type": "application/json",
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
      }
    );

    res.json({
      success: true,
      ipfsHash: response.data.IpfsHash,
      metadataUrl: `${PINATA_GATEWAY}/ipfs/${response.data.IpfsHash}`,
      metadata: nftMetadata,
    });
  } catch (err) {
    console.error("메타데이터 IPFS 업로드 실패:", err.response?.data || err.message);
    res.status(500).json({ error: `메타데이터 업로드 실패: ${err.message}` });
  }
});

module.exports = router;
