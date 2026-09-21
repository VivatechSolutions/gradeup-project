const crypto = require('crypto');
const fail = (message, statusCode = 422) => { throw Object.assign(new Error(message), { statusCode }); };
const id = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const color = value => typeof value === 'string' && /^(#[a-fA-F0-9]{6}|transparent)$/.test(value);
const clone = value => JSON.parse(JSON.stringify(value));
const numeric = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const elementKeys = new Set('id type x y width height rotation opacity text fontFamily fontSize bold italic underline align fill stroke strokeWidth cornerRadius lineHeight list assetId crop groupId'.split(' '));
function validateElement(e) {
  if (!e || !id(e.id) || !['text', 'image', 'rect', 'ellipse', 'line', 'arrow'].includes(e.type)) fail('Invalid slide element');
  if (Object.keys(e).some(k => !elementKeys.has(k))) fail('Unsupported element property');
  for (const key of ['x', 'y']) if (!numeric(e[key], -4000, 8000)) fail(`Invalid ${key}`);
  for (const key of ['width', 'height']) if (!numeric(e[key], 1, 8000)) fail(`Invalid ${key}`);
  for (const [key, min, max] of [['rotation', -3600, 3600], ['opacity', 0, 1], ['fontSize', 6, 300], ['strokeWidth', 0, 50], ['cornerRadius', 0, 500], ['lineHeight', 0.5, 4]]) {
    if (e[key] !== undefined && !numeric(e[key], min, max)) fail(`Invalid ${key}`);
  }
  for (const key of ['fill', 'stroke']) if (e[key] !== undefined && !color(e[key])) fail(`Invalid ${key}`);
  for (const key of ['bold', 'italic', 'underline']) if (e[key] !== undefined && typeof e[key] !== 'boolean') fail(`Invalid ${key}`);
  if (e.text !== undefined && (typeof e.text !== 'string' || e.text.length > 20000)) fail('Text exceeds limit');
  if (e.fontFamily !== undefined && !['Arial', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New', 'Trebuchet MS'].includes(e.fontFamily)) fail('Unsupported font');
  if (e.align !== undefined && !['left', 'center', 'right', 'justify'].includes(e.align)) fail('Invalid text alignment');
  if (e.list !== undefined && !['none', 'bullet', 'number'].includes(e.list)) fail('Invalid list');
  if (e.type === 'image' && !id(e.assetId)) fail('Image requires an uploaded asset');
  if (e.groupId !== undefined && e.groupId !== null && !id(e.groupId)) fail('Invalid group');
  if (e.crop && (!['x','y','width','height'].every(k => numeric(e.crop[k], 0, 1)) || e.crop.width <= 0 || e.crop.height <= 0 || e.crop.x + e.crop.width > 1.001 || e.crop.y + e.crop.height > 1.001)) fail('Invalid normalized image crop');
}
function validateDocument(doc) {
  if (typeof doc.title !== 'string' || !doc.title.trim() || doc.title.length > 200) fail('Title must contain 1-200 characters');
  if (!Array.isArray(doc.slides) || !doc.slides.length || doc.slides.length > 50) fail('A deck must contain 1-50 slides');
  if (Buffer.byteLength(JSON.stringify(doc)) > 2 * 1024 * 1024) fail('Deck exceeds 2 MB limit');
  const slides = new Set();
  for (const slide of doc.slides) {
    if (!id(slide.id) || slides.has(slide.id)) fail('Slide IDs must be unique');
    slides.add(slide.id);
    if (Object.keys(slide).some(k => !['id','title','background','notes','elements'].includes(k))) fail('Unsupported slide property');
    if (!color(slide.background) || typeof slide.title !== 'string' || slide.title.length > 200 || typeof slide.notes !== 'string' || slide.notes.length > 20000) fail('Invalid slide properties');
    if (!Array.isArray(slide.elements) || slide.elements.length > 150) fail('A slide supports up to 150 elements');
    const elements = new Set();
    for (const element of slide.elements) {
      validateElement(element);
      if (elements.has(element.id)) fail('Element IDs must be unique within a slide');
      elements.add(element.id);
    }
  }
  if (!doc.theme || typeof doc.theme !== 'object' || Array.isArray(doc.theme) || JSON.stringify(doc.theme).length > 4096) fail('Invalid theme');
  return doc;
}
function applyOperations(document, operations) {
  if (!Array.isArray(operations) || operations.length > 200) fail('Invalid operations');
  const doc = clone(document);
  for (const op of operations) {
    if (!op || typeof op !== 'object') fail('Invalid operation');
    if (op.op === 'set_theme') { doc.theme = clone(op.theme); continue; }
    if (op.op === 'add_slide') {
      if (op.index !== undefined && (!Number.isInteger(op.index) || op.index < 0 || op.index > doc.slides.length)) fail('Invalid insertion index');
      doc.slides.splice(op.index ?? doc.slides.length, 0, clone(op.slide)); continue;
    }
    if (op.op === 'reorder_slides') {
      if (!Array.isArray(op.ids) || op.ids.length !== doc.slides.length || new Set(op.ids).size !== doc.slides.length || op.ids.some(v => !doc.slides.some(s => s.id === v))) fail('Invalid slide order');
      doc.slides = op.ids.map(v => doc.slides.find(s => s.id === v)); continue;
    }
    const s = doc.slides.find(s => s.id === op.slide_id);
    if (!s) fail('Operation targets an unknown slide');
    if (op.op === 'delete_slide') doc.slides = doc.slides.filter(v => v.id !== s.id);
    else if (op.op === 'update_slide') {
      if (!op.changes || Object.keys(op.changes).some(k => !['title','background','notes','elements'].includes(k))) fail('Invalid slide changes');
      Object.assign(s, clone(op.changes));
    } else if (op.op === 'set_speaker_notes') s.notes = op.value;
    else if (op.op === 'add_element') s.elements.push(clone(op.element));
    else if (op.op === 'update_element') {
      const e = s.elements.find(v => v.id === op.element_id);
      if (!e || !op.changes || 'id' in op.changes || 'type' in op.changes || Object.keys(op.changes).some(k => !elementKeys.has(k))) fail('Invalid element update');
      Object.assign(e, clone(op.changes));
    } else if (op.op === 'delete_element') {
      if (!s.elements.some(e => e.id === op.element_id)) fail('Unknown element');
      s.elements = s.elements.filter(e => e.id !== op.element_id);
    } else if (op.op === 'reorder_elements') {
      if (!Array.isArray(op.ids) || op.ids.length !== s.elements.length || new Set(op.ids).size !== s.elements.length || op.ids.some(v => !s.elements.some(e => e.id === v))) fail('Invalid element order');
      s.elements = op.ids.map(v => s.elements.find(e => e.id === v));
    } else fail(`Unsupported operation: ${op.op}`);
  }
  return validateDocument(doc);
}
function validateStart(data) {
  if (!id(data?.deck_id) || data.deck_ref !== `gradeup:${data.deck_id}` || !id(data.session_id) || data.deck_mode !== 'gradeup') fail('Python must return a GradeUp deck_id, deck_ref and session_id', 502);
  const origins = (process.env.PRESENTATION_ALLOWED_ORIGINS || process.env.FE_URL || '').split(',').map(v => v.trim()).filter(Boolean);
  if (!origins.length) fail('PRESENTATION_ALLOWED_ORIGINS is not configured', 503);
  for (const [key, suffix] of [['edit_url', ''], ['embed_url', '/present']]) {
    let url;
    try { url = new URL(data[key]); } catch { fail(`Python returned an invalid ${key}`, 502); }
    if (!origins.includes(url.origin) || !['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== `/seminar/slides/${data.deck_id}${suffix}`) fail(`Python returned an unexpected ${key}`, 502);
  }
  validateDocument({ title: data.title || 'Seminar Slides', theme: data.theme_spec || {}, slides: data.initial_slides });
}
const hashToken = token => crypto.createHash('sha256').update(String(token)).digest('hex');
module.exports = { fail, id, clone, validateDocument, applyOperations, validateStart, hashToken };
