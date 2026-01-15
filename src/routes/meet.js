const express = require('express');
const router = express.Router();
const {
    createRoom,
    getRoom
} = require('../controllers/meetController');

router.post('/create-room', createRoom);
router.post('/get-room', getRoom);

module.exports = router;
