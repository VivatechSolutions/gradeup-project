const axios = require("axios");
const controller = {
  async explainHiglightedText(req, res) {
    try {
      const { text, user_id } = req.body;

      const payload = {
        text,
        user_id,
      };
      const { data } = await axios.post(
        `${process.env.AI_URL}/highlight/explain`,
        payload,
      );
      console.log(data);
      res.status(200).json({ data: data, status: true });
    } catch (error) {
      console.log("Error in explain Highlighted Text", error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error, status: false });
    }
  },
  async summariseHighlightedText(req, res) {
    try {
      const { text, user_id } = req.body;

      const payload = {
        text,
        user_id,
      };
      const { data } = await axios.post(
        `${process.env.AI_URL}/highlight/summarize`,
        payload,
      );
      console.log(data);
      res.status(200).json({ data: data, status: true });
    } catch (error) {
      console.log("Error in summarise Highlighted Text", error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error, status: false });
    }
  },
  async voiceExplainHighlightedText(req, res) {
    try {
      const { text, user_id, action } = req.body;

      const payload = {
        text,
        user_id,
        action,
      };
      const { data } = await axios.post(
        `${process.env.AI_URL}/highlight/audio`,
        payload,
      );
      console.log(data);
      res.status(200).json({ data: data, status: true });
    } catch (error) {
      console.log("Error in voice Explain Highlighted Text", error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error, status: false });
    }
  },
};

module.exports = controller;
