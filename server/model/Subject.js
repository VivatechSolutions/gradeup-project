const mongoose = require("mongoose");
const schema = mongoose.Schema;
const subjectSchema = new schema(
  {
    grade: String,
    board:String,
    subject:String
  },
  { timestamps: true },
);
module.exports = mongoose.model("Subject", subjectSchema);
