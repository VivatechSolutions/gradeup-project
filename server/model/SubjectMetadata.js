const mongoose = require("mongoose");

const subjectMetadataSchema = new mongoose.Schema(
  {
    board: { 
      type: String, 
      required: true,
      trim: true,
      index: true
    },
    classNumber: { 
      type: String, 
      required: true,
      trim: true,
      index: true
    },
    subject: { 
      type: String, 
      required: true,
      trim: true,
      index: true
    },
    description: { 
      type: String, 
      default: null 
    },
    createdBy: {
      type: String,
      ref: "AdminUser",
      // required: true,
    },
  },
  { timestamps: true },
);

// Unique index for board, classNumber, subject combination
subjectMetadataSchema.index({ board: 1, classNumber: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model("SubjectMetadata", subjectMetadataSchema);