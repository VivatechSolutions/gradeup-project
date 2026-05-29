const express = require("express");
const adminUsersController = require("../controller/AdminUsers");
const {
  requireAdminAuth,
  requirePasswordResetResolved,
  requireSuperAdmin,
} = require("../middleware/adminAuth");

const router = express.Router();

router.use(requireAdminAuth, requirePasswordResetResolved, requireSuperAdmin);

router.get("/", adminUsersController.list);
router.post("/", adminUsersController.create);
router.put("/:id", adminUsersController.update);
router.delete("/:id", adminUsersController.remove);

module.exports = router;
