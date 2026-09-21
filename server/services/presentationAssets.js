const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const Asset = require('../model/PresentationAsset');
const { fail } = require('./presentationDocument');
function storage() {
  const Bucket = process.env.PRESENTATION_S3_BUCKET;
  if (!Bucket) fail('Presentation image storage is not configured', 503);
  return { Bucket, client: new S3Client({ region: process.env.AWS_REGION || 'us-east-1' }) };
}
function imageMime(buffer) {
  if (buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (buffer.length > 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'image/jpeg';
  if (buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  fail('Upload a PNG, JPEG or WebP image');
}
async function upload(deckId, buffer, name, sourceUrl) {
  if (!buffer?.length || buffer.length > 10 * 1024 * 1024) fail('Image must be smaller than 10 MB');
  const mime = imageMime(buffer), assetId = crypto.randomUUID();
  const { client, Bucket } = storage();
  const key = `presentations/${deckId}/${assetId}`;
  await client.send(new PutObjectCommand({ Bucket, Key: key, Body: buffer, ContentType: mime }));
  await Asset.create({ assetId, deckId, key, mime, bytes: buffer.length, name: String(name || 'Image').slice(0, 200), sourceUrl });
  return { assetId, mime };
}
async function read(asset) {
  const { client, Bucket } = storage();
  return client.send(new GetObjectCommand({ Bucket, Key: asset.key }));
}
async function importImage(deckId, url) {
  let parsed; try { parsed = new URL(url); } catch { fail('Invalid image URL'); }
  // Only trusted, rehosted Python search results may be fetched by this server.
  const allowed = (process.env.PRESENTATION_IMAGE_HOSTS || 'gradeup-books-images.s3.us-east-1.amazonaws.com').split(',').map(v => v.trim());
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port || !allowed.includes(parsed.hostname)) fail('This source must be rehosted by the image service first');
  const response = await fetch(parsed, { redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (!response.ok) fail('Unable to download selected image', 502);
  const chunks = []; let bytes = 0;
  for await (const chunk of response.body) { bytes += chunk.length; if (bytes > 10 * 1024 * 1024) fail('Image exceeds 10 MB'); chunks.push(chunk); }
  return upload(deckId, Buffer.concat(chunks), 'AI image', url);
}
module.exports = { upload, read, importImage, imageMime };
