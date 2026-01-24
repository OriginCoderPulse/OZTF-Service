const express = require("express");
const router = express.Router();
const {
  generateQrcode,
  scanQrcode,
  authorizeQrcode,
} = require("../controllers/qrcodeController");

router.post("/generate", generateQrcode);
router.post("/scan", scanQrcode);
router.post("/authorize", authorizeQrcode);

module.exports = router;
