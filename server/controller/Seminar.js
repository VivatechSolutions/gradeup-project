const axios = require("axios");
const controller = {
  async startSeminar(req, res) {
    try {
      const {
        candidate_id,
        student_name,
        class_name,
        school_name,
        chapter_title,
        topic_info,
      } = req.body;

      const payload = {
        candidate_id,
        student_name,
        class_name,
        school_name,
        chapter_title,
        topic_info,
      };
      const { data } = await axios.post(
        `${process.env.AI_URL}/seminar/start`,
        payload,
      );
      console.log(data);
      res.status(200).json({ data: data, status: true });
    } catch (error) {
      console.log("Error in Start Seminar", error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error, status: false });
    }
  },
  async seminarReply(req, res) {
    try {
      const { session_id, student_text } = req.body;

      const payload = {
        session_id,
        student_text,
      };
      const { data } = await axios.post(
        `${process.env.AI_URL}/seminar/reply`,
        payload,
      );
      console.log(data);
      res.status(200).json({ data: data, status: true });
    } catch (error) {
      console.log("Error in Seminar Reply", error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error, status: false });
    }
  },
  async endSeminar(req, res) {
    try {
      const { session_id } = req.body;

      const payload = {
        session_id,
      };
      const { data } = await axios.post(
        `${process.env.AI_URL}/seminar/end`,
        payload,
      );
      console.log(data);
      res.status(200).json({ data: data, status: true });
    } catch (error) {
      console.log("Error in End Seminar", error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error, status: false });
    }
  },
};

module.exports = controller;
