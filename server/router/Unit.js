const express = require("express");

const router = express.Router();
const {
  registerUnit,
  listUnits,
  getUnit,
  getUnitContentTypes,
} = require("../controller/Unit");

router.post("/register", registerUnit);
router.get("/", listUnits);
router.get("/:unitKey/content-types", getUnitContentTypes);
router.get("/:unitKey", getUnit);

module.exports = router;
