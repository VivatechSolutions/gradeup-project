const axios = require("axios");
const controller = {
  async startDebate(req, res) {
    try {
      const {
        candidate_id,
        student_name,
        class_name,
        school_name,
        chapter_title,
      } = req.body;

      const payload = {
        candidate_id,
        student_name,
        class_name,
        school_name,
        chapter_title,
      };
      const { data } = await axios.post(
        `${process.env.AI_URL}/debate/start_full`,
        payload,
      );
      console.log(data);
      res.status(200).json({ data: data, status: true });
    } catch (error) {
      console.log("Error in Start Debate", error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error, status: false });
    }
  },
  async endDebate(req, res) {
    try {
      const { session_id } = req.body;

      const payload = {
        session_id,
      };
      const { data } = await axios.post(
        `${process.env.AI_URL}/debate/end`,
        payload,
      );
      console.log(data);
      res.status(200).json({ data: data, status: true });
    } catch (error) {
      console.log("Error in End Debate", error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error, status: false });
    }
  },
};

module.exports = controller;
