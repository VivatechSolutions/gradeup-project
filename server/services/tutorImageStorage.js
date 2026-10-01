const crypto = require("crypto");
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 1;
function invalid(message, statusCode = 400) {
  throw Object.assign(new Error(message), { statusCode });
}
function imageMime(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return "image/jpeg";
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6))) return "image/gif";
  invalid("Upload a PNG, JPEG, GIF or WebP image.");
}
function validateImages(images = []) {
  if (!Array.isArray(images) || images.length > MAX_IMAGES) invalid(`Attach at most ${MAX_IMAGES} images.`);
  return images.map((image) => {
    const base64 = image?.base64;
    if (typeof base64 !== "string" || !base64 || base64.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) invalid("Invalid image data or image exceeds 5 MB.");
    const buffer = Buffer.from(base64, "base64");
    if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) invalid("Image must be smaller than 5 MB.");
    const type = imageMime(buffer);
    return { buffer, base64, type, name: String(image.name || "Attached image").slice(0, 200), size: buffer.length };
  });
}
function storage() {
  const Bucket = process.env.TUTOR_S3_BUCKET || process.env.PRESENTATION_S3_BUCKET;
  if (!Bucket) invalid("Tutor image storage is not configured. Set TUTOR_S3_BUCKET.", 503);
  return { Bucket, client: new S3Client({ region: process.env.AWS_REGION || "us-east-1" }) };
}
async function uploadImages(candidateId, conversationId, images) {
  if (!images.length) return [];
  const { Bucket, client } = storage();
  const uploaded = [];
  try {
    for (const image of images) {
      const id = crypto.randomUUID();
      const key = `tutor/${encodeURIComponent(candidateId)}/${encodeURIComponent(conversationId)}/${id}`;
      await client.send(new PutObjectCommand({ Bucket, Key: key, Body: image.buffer, ContentType: image.type }));
      uploaded.push({ id, key, bucket: Bucket, name: image.name, type: image.type, size: image.size });
    }
    return uploaded;
  } catch (error) {
    await deleteImages(uploaded).catch(() => null);
    throw error;
  }
}
async function readImage(image) {
  const { client } = storage();
  return client.send(new GetObjectCommand({ Bucket: image.bucket, Key: image.key }));
}
async function deleteImages(images) {
  if (!images.length) return;
  const { client } = storage();
  await Promise.all(images.map((image) => client.send(new DeleteObjectCommand({ Bucket: image.bucket, Key: image.key }))));
}
module.exports = { validateImages, uploadImages, readImage, deleteImages };
