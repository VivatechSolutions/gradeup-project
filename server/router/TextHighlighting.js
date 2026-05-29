const express = require("express");
const router = express.Router();

//declaring the function from controller
const {
  explainHiglightedText,
  summariseHighlightedText,
  voiceExplainHighlightedText
} = require("../controller/TextHighlighting.js");

router.post("/explain/text", explainHiglightedText);
router.post("/summarise/text", summariseHighlightedText);
router.post("/voice/explain/text", voiceExplainHighlightedText);



module.exports = router;
