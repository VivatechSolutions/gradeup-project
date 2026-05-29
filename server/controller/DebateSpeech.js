const fs = require("fs/promises");
const { formidable } = require("formidable");
const { synthesizeSpeech, transcribeAudioFile } = require("../services/speechService");

function parseForm(req) {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ fields, files });
    });
  });
}

const controller = {
  async transcribe(req, res) {
    let uploadedFilePath = null;

    try {
      const { fields, files } = await parseForm(req);
      const file = files.audio;
      const uploadedFile = Array.isArray(file) ? file[0] : file;

      if (!uploadedFile?.filepath) {
        return res.status(400).json({
          status: false,
          message: "Audio file is required",
        });
      }

      uploadedFilePath = uploadedFile.filepath;
      const result = await transcribeAudioFile({
        filePath: uploadedFile.filepath,
        fileName: uploadedFile.originalFilename || "speech.webm",
        language: Array.isArray(fields.language) ? fields.language[0] : fields.language,
      });

      return res.status(200).json({
        status: true,
        data: result,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to transcribe audio",
      });
    } finally {
      if (uploadedFilePath) {
        await fs.unlink(uploadedFilePath).catch(() => null);
      }
    }
  },

  async speak(req, res) {
    try {
      const result = await synthesizeSpeech({
        text: req.body.text,
        voice: req.body.voice,
        format: req.body.format,
      });

      return res.status(200).json({
        status: true,
        data: result,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to generate speech",
      });
    }
  },
};

module.exports = controller;
