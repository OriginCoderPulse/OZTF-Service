const express = require('express');
const router = express.Router();
const { initial } = require('../controllers/initialController');

router.post('/', initial);

module.exports = router;
