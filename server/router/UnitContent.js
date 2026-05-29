const express = require("express");

const router = express.Router();
const {
  upsertUnitContent,
  upsertStructuredContent,
  upsertEnrichedContent,
  getUnitContent,
  listUnitContentVersions,
} = require("../controller/UnitContent");

router.post("/", upsertUnitContent);
router.post("/structured", upsertStructuredContent);
router.post("/enriched", upsertEnrichedContent);
router.get("/:unitKey/versions", listUnitContentVersions);
router.get("/:unitKey", getUnitContent);

module.exports = router;
