const fs = require("fs/promises");
const axios = require("axios");
const FormData = require("form-data");

function getOpenAiKey() {
  return process.env.OPENAI_API_KEY_TEXT || process.env.OPENAI_API_KEY || "";
}

function ensureSpeechConfig() {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    const error = new Error("Speech service is not configured");
    error.statusCode = 500;
    throw error;
  }

  return {
    apiKey,
    transcriptionModel: process.env.OPENAI_STT_MODEL || "whisper-1",
    ttsModel: process.env.OPENAI_TTS_MODEL || "tts-1",
    ttsVoice: process.env.OPENAI_TTS_VOICE || "alloy",
  };
}

async function transcribeAudioFile({ filePath, fileName = "speech.webm", language = "en" }) {
  const { apiKey, transcriptionModel } = ensureSpeechConfig();
  const fileBuffer = await fs.readFile(filePath);
  const form = new FormData();

  form.append("model", transcriptionModel);
  form.append("language", language);
  form.append("file", fileBuffer, fileName);

  const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", form, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...form.getHeaders(),
    },
    timeout: Number(process.env.OPENAI_AUDIO_TIMEOUT_MS || 120000),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  return {
    text: response.data?.text || "",
    raw: response.data,
  };
}

async function synthesizeSpeech({ text, voice, format = "mp3" }) {
  const { apiKey, ttsModel, ttsVoice } = ensureSpeechConfig();
  const response = await axios.post(
    "https://api.openai.com/v1/audio/speech",
    {
      model: ttsModel,
      voice: voice || ttsVoice,
      input: String(text || "").slice(0, 4000),
      format,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer",
      timeout: Number(process.env.OPENAI_AUDIO_TIMEOUT_MS || 120000),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    },
  );

  const base64 = Buffer.from(response.data).toString("base64");
  const mimeType = format === "wav" ? "audio/wav" : "audio/mpeg";

  return {
    base64,
    mimeType,
    dataUrl: `data:${mimeType};base64,${base64}`,
  };
}

async function createRealtimeSession() {
  const { apiKey } = ensureSpeechConfig();
  
  if (!apiKey) {
    const error = new Error("OpenAI API key not configured");
    error.statusCode = 500;
    throw error;
  }

  try {
    const sessionConfig = {
      session: {
        type: "realtime",
        model: "gpt-realtime-2",
        audio: {
          output: {
            voice: process.env.OPENAI_REALTIME_VOICE || "marin",
          },
        },
      },
    };

    const response = await axios.post(
      "https://api.openai.com/v1/realtime/client_secrets",
      sessionConfig,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    if (!response.data?.value) {
      throw new Error("Invalid realtime session response from OpenAI");
    }

    return {
      clientSecret: response.data.value,
      expiresAt: response.data.expires_at || null,
      raw: response.data,
    };
  } catch (error) {
    console.error("Realtime session creation error:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    const err = new Error(`Realtime session creation failed: ${error.message}`);
    err.statusCode = error.response?.status || 500;
    throw err;
  }
}

module.exports = {
  transcribeAudioFile,
  synthesizeSpeech,
  createRealtimeSession,
};