const express = require("express");
const controller = require("../controller/DebateSpeech");

const router = express.Router();

router.post("/transcribe", controller.transcribe);
router.post("/speak", controller.speak);

module.exports = router;
