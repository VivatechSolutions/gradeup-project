const express = require("express");
const controller = require("../controller/HighlightingV2");

const router = express.Router();

router.post("/explain", controller.explain);
router.post("/summarize", controller.summarize);
router.post("/ask", controller.ask);
router.post("/read", controller.read);

module.exports = router;
