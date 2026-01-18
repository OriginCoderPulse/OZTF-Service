const express = require("express");
const router = express.Router();
const { getBugList } = require("../controllers/bugController");

router.post("/list", getBugList);

module.exports = router;
