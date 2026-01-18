const express = require("express");
const router = express.Router();
const {
  getStaffInfo,
  getStaffDevelopers,
  changeStaffStatus,
  getDepartmentStats,
  getSalaryLevelStats,
} = require("../controllers/staffController");

router.post("/info", getStaffInfo);
router.post("/developers", getStaffDevelopers);
router.post("/change-status", changeStaffStatus);
router.post("/department-stats", getDepartmentStats);
router.post("/salary-level-stats", getSalaryLevelStats);

module.exports = router;
