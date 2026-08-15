const mongoose = require("mongoose");

const studentProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    studentType: {
      type: String,
      enum: ["independent"],
      default: "independent",
      index: true,
    },
    schoolContext: {
      name: { type: String, default: null, trim: true },
      status: {
        type: String,
        enum: ["unverified", "none"],
        default: "unverified",
      },
    },
    independentLearningContext: {
      board: { type: String, required: true, trim: true, index: true },
      classNumber: { type: String, required: true, trim: true, index: true },
      subjects: { type: [String], default: [] },
    },
    status: {
      type: String,
      enum: ["active", "suspended", "disabled"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

studentProfileSchema.index({
  "independentLearningContext.board": 1,
  "independentLearningContext.classNumber": 1,
});

module.exports = mongoose.model("StudentProfile", studentProfileSchema);
