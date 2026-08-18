const mongoose = require("mongoose");

const communityPollOptionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    votes: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const communityPollSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorName: { type: String, trim: true },
    question: { type: String, required: true, trim: true },
    visibility: { type: String, enum: ["all", "school"], default: "all", index: true },
    schoolName: { type: String, trim: true, default: null, index: true },
    classNumber: { type: String, trim: true, default: null },
    options: { type: [communityPollOptionSchema], default: [] },
    votedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

communityPollSchema.index({ visibility: 1, schoolName: 1, deletedAt: 1, createdAt: -1 });

module.exports = mongoose.model("CommunityPoll", communityPollSchema);
