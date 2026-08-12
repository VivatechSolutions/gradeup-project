const mongoose = require("mongoose");

const groupMemberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userRole: { type: String, enum: ["student", "teacher"], default: "student" },
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    role: { type: String, enum: ["admin", "member"], default: "member" },
    status: { type: String, enum: ["active", "left"], default: "active" },
    joinedAt: { type: Date, default: Date.now },
    leftAt: Date,
    lastSeenAt: Date,
  },
  { _id: false },
);

const groupActionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["created", "joined", "left", "admin_assigned", "deleted"],
      required: true,
    },
    actorId: mongoose.Schema.Types.ObjectId,
    actorRole: String,
    targetId: mongoose.Schema.Types.ObjectId,
    targetRole: String,
    metadata: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const groupChatSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    category: { type: String, trim: true, default: "Community" },
    icon: { type: String, default: "#" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    createdByRole: { type: String, enum: ["student", "teacher"], default: "student" },
    adminId: { type: mongoose.Schema.Types.ObjectId, required: true },
    adminRole: { type: String, enum: ["student", "teacher"], default: "student" },
    members: [groupMemberSchema],
    actionLog: [groupActionSchema],
    deletedAt: Date,
  },
  { timestamps: true },
);

groupChatSchema.index({ "members.userId": 1, deletedAt: 1 });

module.exports = mongoose.model("GroupChat", groupChatSchema);
