const mongoose = require("mongoose");
const schema = mongoose.Schema;
const teacherSchema = new schema(
  {
    email: String,
    phoneNumber: String,
    password: String,
    school: String,
    teacherId: String,
  },
  { timestamps: true },
);
module.exports = mongoose.model("Teacher", teacherSchema);
