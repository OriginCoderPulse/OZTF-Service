const express = require("express");
const router = express.Router();
const {
  generateQrcode,
  checkQrcodeStatus,
  scanQrcode,
  authorizeQrcode,
} = require("../controllers/qrcodeController");

router.post("/generate", generateQrcode);
router.post("/status", checkQrcodeStatus);
router.post("/scan", scanQrcode);
router.post("/authorize", authorizeQrcode);

module.exports = router;
