const express = require("express");
const router = express.Router();
const { getStaffInfo, getStaffDevelopers, changeStaffStatus } = require("../controllers/staffController");

router.post("/info", getStaffInfo);
router.post("/developers", getStaffDevelopers);
router.post("/change-status", changeStaffStatus);

module.exports = router;
