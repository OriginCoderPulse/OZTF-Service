const express = require("express");
const router = express.Router();
const {
  createRoom,
  getRoom,
  statusChange,
  addOutParticipant,
  removeOutParticipant,
  addInnerParticipant,
  removeInnerParticipant,
  getRoomProperties,
  getMeetingByMeetId,
  generateUserSigForMeeting,
} = require("../controllers/meetController");

router.post("/create-room", createRoom);
router.post("/get-room", getRoom);
router.post("/status-change", statusChange);
router.post("/add-out-participant", addOutParticipant);
router.post("/remove-out-participant", removeOutParticipant);
router.post("/add-inner-participant", addInnerParticipant);
router.post("/remove-inner-participant", removeInnerParticipant);
router.post("/get-room-properties", getRoomProperties);
router.post("/get-meeting-by-meetid", getMeetingByMeetId);
router.post("/generate-usersig", generateUserSigForMeeting);

module.exports = router;
