const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    schoolName: { type: String, default: null, trim: true, index: true },
    board: { type: String, default: null, trim: true, index: true },
    classNumber: { type: String, default: null, trim: true, index: true },
    academicYear: { type: String, default: null, trim: true },
    teacherIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Teacher" }],
    status: { type: String, enum: ["active", "archived"], default: "active", index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Batch", batchSchema);
