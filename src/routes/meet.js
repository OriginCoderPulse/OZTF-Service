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
  verifyPassword,
  generateUserSigForMeeting,
} = require("../controllers/meetController");

router.put("/create-room", createRoom);
router.post("/get-room", getRoom);
router.post("/status-change", statusChange);
router.put("/add-out-participant", addOutParticipant);
router.delete("/remove-out-participant", removeOutParticipant);
router.put("/add-inner-participant", addInnerParticipant);
router.delete("/remove-inner-participant", removeInnerParticipant);
router.post("/get-room-properties", getRoomProperties);
router.post("/get-meeting-by-meetid", getMeetingByMeetId);
router.post("/verify-password", verifyPassword);
router.post("/generate-usersig", generateUserSigForMeeting);

module.exports = router;
