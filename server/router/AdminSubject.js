const express = require("express");
const adminSubjectController = require("../controller/AdminSubject");
const {
  requireAdminAuth,
  requirePasswordResetResolved,
} = require("../middleware/adminAuth");
const multer = require("multer");
const upload = multer({ 
  dest: "uploads/temp/",
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  }
});
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
// Question Bank Upload
router.post(
  "/admin/question-bank/upload",
  upload.single("file"), // Expects single file with field name "file"
  adminSubjectController.uploadQuestionBank
);


module.exports = router;
