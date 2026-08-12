const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, default: "application/octet-stream" },
    size: { type: Number, default: 0 },
    path: { type: String, required: true },
  },
  { _id: false },
);

const groupMessageSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "GroupChat", required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    senderRole: { type: String, enum: ["student", "teacher"], default: "student" },
    senderName: { type: String, trim: true },
    text: { type: String, trim: true, default: "" },
    type: { type: String, enum: ["message", "attachment", "system"], default: "message" },
    attachment: attachmentSchema,
    metadata: mongoose.Schema.Types.Mixed,
    deletedAt: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model("GroupMessage", groupMessageSchema);
