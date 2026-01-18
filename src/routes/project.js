const express = require("express");
const router = express.Router();
const {
  getProjectDetail,
  addProject,
  getProjectRole,
  exportProjectFeatures,
} = require("../controllers/projectController");

router.post("/detail", getProjectDetail);
router.post("/add", addProject);
router.post("/getRole", getProjectRole);
router.post("/feature/export", exportProjectFeatures);

module.exports = router;
