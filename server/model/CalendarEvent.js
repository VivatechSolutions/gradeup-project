const mongoose = require("mongoose");

const calendarEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    studentProfileId: { type: mongoose.Schema.Types.ObjectId, ref: "StudentProfile", required: true, index: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ["class", "meeting", "debate", "seminar", "exam", "study", "homework", "other"], default: "study", index: true },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true, index: true },
    timezone: { type: String, default: "UTC", trim: true },
    description: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },
    subjectGroupKey: { type: String, default: null, trim: true, index: true },
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: "SubjectUnit", default: null },
    sourceType: { type: String, default: "student", trim: true, index: true },
    sourceId: { type: String, default: null, trim: true, index: true },
    status: { type: String, enum: ["scheduled", "completed", "cancelled"], default: "scheduled", index: true },
    reminderMinutes: { type: [Number], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

calendarEventSchema.index({ userId: 1, startsAt: 1 });

module.exports = mongoose.model("CalendarEvent", calendarEventSchema);
