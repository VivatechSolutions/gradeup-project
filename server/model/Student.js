const mongoose = require("mongoose");
const schema = mongoose.Schema;
const studentSchema = new schema(
  {
    name: { type: String, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
    class: String,
    grade: String,
    board: { type: String, enum: ["State", "CBSE", "State Board", "ICSE", "IB", "Cambridge", ""], default: "" },
    phoneNumber: String,
    password: String,
    school: String,
    studentId: { type: String, unique: true, sparse: true },
    googleId: String,
    authProvider: { type: String, default: "local" },
    subjects: [String],
    passwordResetIssuedAt: Date,
    lastLoginAt: Date,
  },
  { timestamps: true },
);
module.exports = mongoose.model("Student", studentSchema);
