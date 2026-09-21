import Konva from 'konva';
import { jsPDF } from 'jspdf';
import { Slide, SlideDocument, WIDTH, HEIGHT } from './types';
import { assetBlob } from './api';
export function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); }
export async function renderSlide(slide: Slide, deckId: string, token: string) {
  const div = document.createElement('div'); div.style.position = 'fixed'; div.style.left = '-10000px'; document.body.appendChild(div);
  const stage = new Konva.Stage({ container: div, width: WIDTH, height: HEIGHT }), layer = new Konva.Layer(); stage.add(layer);
  layer.add(new Konva.Rect({ width: WIDTH, height: HEIGHT, fill: slide.background }));
  const urls: string[] = [];
  try {
    for (const e of slide.elements) {
      const props: any = { ...e }; delete props.type; delete props.id;
      let node: Konva.Shape;
      if (e.type === 'text') node = new Konva.Text({ ...props, text: (e.text || '').split('\n').map((s, i) => e.list === 'bullet' ? '\u2022 ' + s : e.list === 'number' ? `${i + 1}. ${s}` : s).join('\n'), fontStyle: `${e.bold ? 'bold ' : ''}${e.italic ? 'italic' : ''}`, textDecoration: e.underline ? 'underline' : '' });
      else if (e.type === 'image') {
        const url = await assetBlob(deckId, e.assetId!, token); urls.push(url);
        const image = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('Could not export image')); img.src = url; });
        const c = e.crop || { x: 0, y: 0, width: 1, height: 1 };
        node = new Konva.Image({ ...props, image, crop: { x: c.x * image.width, y: c.y * image.height, width: c.width * image.width, height: c.height * image.height } });
      } else if (e.type === 'ellipse') node = new Konva.Ellipse({ ...props, radiusX: e.width / 2, radiusY: e.height / 2, offsetX: -e.width / 2, offsetY: -e.height / 2 });
      else if (e.type === 'line' || e.type === 'arrow') { const C = e.type === 'arrow' ? Konva.Arrow : Konva.Line; node = new C({ ...props, points: [0, 0, e.width, e.height], pointerLength: 14, pointerWidth: 14 }); }
      else node = new Konva.Rect(props);
      layer.add(node);
    }
    layer.draw(); return stage.toDataURL({ pixelRatio: 1.5 });
  } finally { stage.destroy(); div.remove(); urls.forEach(URL.revokeObjectURL); }
}
export async function exportPdf(doc: SlideDocument, deckId: string, token: string) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [WIDTH, HEIGHT] });
  for (let i = 0; i < doc.slides.length; i++) { if (i) pdf.addPage([WIDTH, HEIGHT], 'landscape'); pdf.addImage(await renderSlide(doc.slides[i], deckId, token), 'PNG', 0, 0, WIDTH, HEIGHT); }
  pdf.save(`${doc.title}.pdf`);
}
