import { createPptx } from './pptx';
import { SlideDocument } from './types';

test('creates an editable PowerPoint package with slide notes', async () => {
  const document: SlideDocument = {
    title: 'PowerPoint export test',
    theme: { font_family: 'Arial' },
    slides: [{
      id: 'slide-1',
      title: 'Test slide',
      background: '#F0F4FF',
      notes: 'Speaker note check',
      elements: [
        { id: 'title-1', type: 'text', x: 72, y: 42, width: 600, height: 80, text: 'Editable title', fontFamily: 'Arial', fontSize: 32, bold: true, fill: '#0D47A1', list: 'none' },
        { id: 'rect-1', type: 'rect', x: 72, y: 150, width: 500, height: 300, fill: '#FFFFFF', stroke: '#0284C7', strokeWidth: 2 },
        { id: 'arrow-1', type: 'arrow', x: 600, y: 300, width: 300, height: 1, stroke: '#C62828', strokeWidth: 3 },
      ],
    }],
  };

  const pptx = await createPptx(document, '', '');
  const output = await pptx.write({ outputType: 'uint8array', compression: true });

  expect(output).toBeInstanceOf(Uint8Array);
  expect((output as Uint8Array).byteLength).toBeGreaterThan(1000);
  expect(Array.from((output as Uint8Array).slice(0, 2))).toEqual([0x50, 0x4b]);
});
