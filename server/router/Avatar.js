const express = require("express");
const controller = require("../controller/Avatar");
const { requireStudentAuth } = require("../middleware/studentAuth");
const { injectStudentIdentity } = require("../middleware/injectStudentIdentity");

const router = express.Router();

router.use(requireStudentAuth, injectStudentIdentity);

router.post("/start", controller.start);
router.post("/raise-hand", controller.raiseHand);
router.post("/flashcard/generate", controller.generateFlashcard);
router.post("/resume", controller.resume);
router.post("/end", controller.end);

module.exports = router;
