const express = require('express');
const router = express.Router();
const {
  getFeatureList
} = require('../controllers/featureController');

router.post('/list', getFeatureList);

module.exports = router;
