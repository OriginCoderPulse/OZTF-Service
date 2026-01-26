const express = require("express");
const router = express.Router();
const { getDailyRecord } = require("../controllers/attendanceController");

router.post("/getDailyRecord", getDailyRecord);

module.exports = router;
