const test = require('node:test');
const assert = require('node:assert/strict');
const { applyOperations, validateDocument, validateStart, hashToken } = require('../services/presentationDocument');
const { imageMime } = require('../services/presentationAssets');
const doc = () => ({ title: 'Science', theme: {}, slides: [{ id: 's1', title: 'Nutrition', background: '#ffffff', notes: '', elements: [{ id: 'e1', type: 'text', x: 10, y: 20, width: 400, height: 100, text: 'Food' }] }, { id: 's2', title: 'Energy', background: '#ffffff', notes: '', elements: [] }] });
test('AI edits stable slide ID after reorder, preserving other slides', () => {
  const original = doc();
  const updated = applyOperations(original, [{ op: 'reorder_slides', ids: ['s2','s1'] }, { op: 'update_element', slide_id: 's1', element_id: 'e1', changes: { text: 'Updated' } }]);
  assert.equal(updated.slides[1].elements[0].text, 'Updated'); assert.equal(original.slides[0].elements[0].text, 'Food'); assert.equal(updated.slides[0].elements.length, 0);
});
test('unknown operations, duplicate IDs and nonexistent targets are rejected atomically', () => {
  assert.throws(() => applyOperations(doc(), [{ op: 'set_layout', slide_id: 's1' }]));
  assert.throws(() => applyOperations(doc(), [{ op: 'update_element', slide_id: 's2', element_id: 'e1', changes: { text: 'x' } }]));
  assert.throws(() => applyOperations(doc(), [{ op: 'add_slide', slide: doc().slides[0] }]));
  assert.throws(() => applyOperations(doc(), [{ op: 'reorder_slides', ids: ['s1','s1'] }]));
});
test('reject malformed geometry, arbitrary properties and foreign image references', () => {
  for (const changes of [{ x: Infinity }, { fontSize: -1 }, { opacity: 3 }, { onclick: 'evil' }, { id: 'replacement' }]) assert.throws(() => applyOperations(doc(), [{ op: 'update_element', slide_id: 's1', element_id: 'e1', changes }]));
  assert.throws(() => applyOperations(doc(), [{ op: 'add_element', slide_id: 's1', element: { id:'img', type:'image', x:0, y:0, width:100, height:100, assetId:'https://external/image' } }]));
});
test('cannot delete last slide', () => assert.throws(() => applyOperations(doc(), [{ op:'delete_slide',slide_id:'s1' },{ op:'delete_slide',slide_id:'s2' }])));
test('Python identity and URL origin/path are preserved and validated', () => {
  process.env.PRESENTATION_ALLOWED_ORIGINS = 'https://gradeup.example';
  const start = { deck_id:'deck-1', deck_ref:'gradeup:deck-1', session_id:'session-1', deck_mode:'gradeup', edit_url:'https://gradeup.example/seminar/slides/deck-1', embed_url:'https://gradeup.example/seminar/slides/deck-1/present', initial_slides:doc().slides };
  assert.doesNotThrow(() => validateStart(start));
  for (const patch of [{ edit_url:'https://evil.example/seminar/slides/deck-1' }, { deck_ref:'gslides:deck-1' }, { initial_slides:[] }, { embed_url:'https://gradeup.example/seminar/slides/other/present' }]) assert.throws(() => validateStart({ ...start, ...patch }));
});
test('content limits and image type sniffing', () => {
  const value = doc(); value.slides[0].elements[0].text = 'x'.repeat(20001); assert.throws(() => validateDocument(value));
  assert.equal(imageMime(Buffer.from([137,80,78,71,13,10,26,10,0])), 'image/png');
  assert.throws(() => imageMime(Buffer.from('<svg onload="x"/>')));
  assert.equal(hashToken('token').length, 64); assert.notEqual(hashToken('token'), 'token');
});
