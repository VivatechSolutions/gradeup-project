const express = require("express");
const adminSubjectController = require("../controller/AdminSubject");
const {
  requireAdminAuth,
  requirePasswordResetResolved,
} = require("../middleware/adminAuth");

const router = express.Router();

router.post("/", requireAdminAuth, requirePasswordResetResolved, adminSubjectController.uploadSubject);
router.get("/", requireAdminAuth, requirePasswordResetResolved, adminSubjectController.listSubjects);
router.get("/groups/:groupKey", requireAdminAuth, requirePasswordResetResolved, adminSubjectController.getSubjectGroup);
router.put("/groups/:groupKey", requireAdminAuth, requirePasswordResetResolved, adminSubjectController.updateSubjectGroup);
router.delete("/groups/:groupKey", requireAdminAuth, requirePasswordResetResolved, adminSubjectController.deleteSubjectGroup);
router.delete("/units/:unitId", requireAdminAuth, requirePasswordResetResolved, adminSubjectController.deleteSubjectUnit);
router.get("/uploads", requireAdminAuth, requirePasswordResetResolved, adminSubjectController.listUploadProcesses);
router.get("/uploads/:id/status", requireAdminAuth, requirePasswordResetResolved, adminSubjectController.getUploadStatus);
router.get("/:id", requireAdminAuth, requirePasswordResetResolved, adminSubjectController.getSubject);

module.exports = router;
