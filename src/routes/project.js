const express = require('express');
const router = express.Router();
const {
  getProjectDetail,
  addProject
} = require('../controllers/projectController');

router.post('/detail', getProjectDetail);
router.post('/add', addProject);

module.exports = router;
