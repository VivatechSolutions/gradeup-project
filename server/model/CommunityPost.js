const mongoose = require("mongoose");

const communityCommentSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, trim: true },
    content: { type: String, required: true, trim: true },
    deletedAt: Date,
  },
  { timestamps: true },
);

const communityPostSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorName: { type: String, trim: true },
    type: {
      type: String,
      enum: ["discussion", "question", "achievement", "study_tip"],
      default: "discussion",
      index: true,
    },
    content: { type: String, required: true, trim: true },
    visibility: { type: String, enum: ["all", "school"], default: "all", index: true },
    schoolName: { type: String, trim: true, default: null, index: true },
    classNumber: { type: String, trim: true, default: null },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [communityCommentSchema],
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

communityPostSchema.index({ visibility: 1, schoolName: 1, deletedAt: 1, createdAt: -1 });

module.exports = mongoose.model("CommunityPost", communityPostSchema);
