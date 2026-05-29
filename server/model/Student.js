const mongoose = require("mongoose");
const schema = mongoose.Schema;
const studentSchema = new schema(
  {
    email: String,
    grade: String,
    phoneNumber: String,
    password: String,
    school: String,
    studentId: String,
  },
  { timestamps: true },
);
module.exports = mongoose.model("Student", studentSchema);
