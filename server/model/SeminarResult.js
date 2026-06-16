const mongoose = require("mongoose");

const seminarResultSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", index: true },
    studentId: { type: String, index: true },
    sessionId: { type: String, index: true },
    candidateId: String,
    result: mongoose.Schema.Types.Mixed,
    liveSession: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

module.exports = mongoose.model("SeminarResult", seminarResultSchema);
