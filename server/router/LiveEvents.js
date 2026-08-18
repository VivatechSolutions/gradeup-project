const express = require("express");
const controller = require("../controller/LiveEvents");
const { requireStudentAuth } = require("../middleware/studentAuth");
const { injectStudentIdentity } = require("../middleware/injectStudentIdentity");

const router = express.Router();

router.use(requireStudentAuth, injectStudentIdentity);

router.get("/", controller.listLiveEvents);

module.exports = router;
