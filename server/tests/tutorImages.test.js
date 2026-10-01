const assert = require("node:assert/strict");
const { validateImages } = require("../services/tutorImageStorage");
const { normalizeConversation } = require("../services/tutorConversationService");

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
const images = validateImages([{ base64: png.toString("base64"), name: "diagram.png", type: "image/jpeg" }]);
assert.equal(images[0].type, "image/png");
assert.equal(images[0].size, png.length);
assert.throws(() => validateImages([{ base64: Buffer.from("%PDF-1.7").toString("base64") }]), /PNG/);
assert.throws(() => validateImages(Array(2).fill({})), /at most 1/);
assert.throws(() => validateImages([{ base64: "invalid!" }]), /Invalid image/);
assert.throws(() => validateImages([{ base64: Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64") }]), /5 MB/);
assert.deepEqual(validateImages(), []);
const chat = normalizeConversation({ conversationId: "chat-1", messages: [{ role: "user", content: "Explain", attachments: [{ id: "image-1", key: "private/key", bucket: "private", name: "diagram.png", type: "image/png", size: 9 }] }] });
assert.equal(chat.messages[0].attachments[0].dataUrl, "/api/v1/tutor/conversations/chat-1/images/image-1");
assert.equal(chat.messages[0].attachments[0].key, undefined);
assert.equal(chat.messages[0].attachments[0].bucket, undefined);
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { uploadImages, readImage, deleteImages } = require("../services/tutorImageStorage");

(async () => {
  const originalSend = S3Client.prototype.send;
  const originalBucket = process.env.TUTOR_S3_BUCKET;
  process.env.TUTOR_S3_BUCKET = "test-private-bucket";
  const commands = [];
  try {
    S3Client.prototype.send = async function(command) { commands.push(command); return { Body: png }; };
    const uploaded = await uploadImages("student-1", "chat-1", images);
    assert.equal(uploaded[0].bucket, "test-private-bucket");
    assert.match(uploaded[0].key, /^tutor\/student-1\/chat-1\//);
    assert.equal(commands[0] instanceof PutObjectCommand, true);
    assert.equal(commands[0].input.ContentType, "image/png");
    await readImage(uploaded[0]);
    assert.equal(commands[1] instanceof GetObjectCommand, true);
    await deleteImages(uploaded);
    assert.equal(commands[2] instanceof DeleteObjectCommand, true);
    commands.length = 0;
    let puts = 0;
    S3Client.prototype.send = async function(command) {
      commands.push(command);
      if (command instanceof PutObjectCommand && ++puts === 2) throw new Error("Storage unavailable");
      return {};
    };
    await assert.rejects(uploadImages("student-1", "chat-1", [...images, ...images]), /Storage unavailable/);
    assert.equal(commands[2] instanceof DeleteObjectCommand, true);
    console.log("Tutor image validation, history serialization, and mocked storage lifecycle passed");
  } finally {
    S3Client.prototype.send = originalSend;
    if (originalBucket === undefined) delete process.env.TUTOR_S3_BUCKET;
    else process.env.TUTOR_S3_BUCKET = originalBucket;
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
