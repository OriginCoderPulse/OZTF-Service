const express = require('express');
const router = express.Router();
const {
  getFeatureList,
  exportFeatures
} = require('../controllers/featureController');

router.post('/list', getFeatureList);
router.post('/export', exportFeatures);

module.exports = router;
