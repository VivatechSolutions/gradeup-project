const mongoose = require("mongoose");
const schema = mongoose.Schema;
const studentSchema = new schema(
  {
    grade: String,
    board:String,
    subject:String
  },
  { timestamps: true },
);
module.exports = mongoose.model("Student", studentSchema);