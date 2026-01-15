const express = require('express');
const router = express.Router();
const {
    createRoom,
    getRoom,
    statusChange
} = require('../controllers/meetController');

router.post('/create-room', createRoom);
router.post('/get-room', getRoom);
router.post('/status-change', statusChange);

module.exports = router;
