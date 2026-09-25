import PptxGenJS from 'pptxgenjs';
import { SlideDocument, SlideElement } from './types';
import { assetDataUrl } from './api';

const PX_PER_INCH = 96;
const toInches = (value: number) => value / PX_PER_INCH;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const transparency = (opacity = 1) => Math.round((1 - clamp(opacity, 0, 1)) * 100);
const color = (value: string | undefined, fallback = '000000') => {
  const cleaned = String(value || '').replace('#', '').trim();
  if (/^[0-9a-f]{6}$/i.test(cleaned)) return cleaned.toUpperCase();
  if (/^[0-9a-f]{3}$/i.test(cleaned)) return cleaned.split('').map(char => char + char).join('').toUpperCase();
  return fallback;
};
const position = (element: SlideElement) => ({
  x: toInches(element.x), y: toInches(element.y),
  w: toInches(element.width), h: toInches(element.height),
  rotate: element.rotation || 0,
});
const safeFileName = (name: string) => name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').replace(/[. ]+$/g, '').trim() || 'GradeUp presentation';

function loadImage(data: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not prepare cropped image for PowerPoint'));
    image.src = data;
  });
}

async function cropImage(data: string, crop?: SlideElement['crop']) {
  const normalizedCrop = crop || { x: 0, y: 0, width: 1, height: 1 };
  const isFullImage = normalizedCrop.x === 0 && normalizedCrop.y === 0 && normalizedCrop.width === 1 && normalizedCrop.height === 1;
  if (isFullImage && /^data:image\/(png|jpe?g|gif);/i.test(data)) return data;
  const image = await loadImage(data);
  const sourceWidth = Math.max(1, image.naturalWidth * clamp(normalizedCrop.width, 0.001, 1));
  const sourceHeight = Math.max(1, image.naturalHeight * clamp(normalizedCrop.height, 0.001, 1));
  const scale = Math.min(1, 4096 / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image cropping is unavailable in this browser');
  context.drawImage(image,
    image.naturalWidth * clamp(normalizedCrop.x, 0, 1), image.naturalHeight * clamp(normalizedCrop.y, 0, 1),
    sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

function addText(slide: PptxGenJS.Slide, element: SlideElement) {
  const options: PptxGenJS.TextPropsOptions = {
    ...position(element), objectName: element.id,
    fontFace: element.fontFamily || 'Arial', fontSize: element.fontSize || 32,
    bold: !!element.bold, italic: !!element.italic,
    underline: element.underline ? { style: 'sng' } : undefined,
    align: element.align || 'left', valign: 'top',
    color: color(element.fill, '17251F'), transparency: transparency(element.opacity),
    lineSpacingMultiple: element.lineHeight || 1.2, margin: 0, fit: 'shrink',
  };
  if (!element.list || element.list === 'none') {
    slide.addText(element.text || '', options);
    return;
  }
  const lines = (element.text || '').split('\n');
  slide.addText(lines.map((text, index) => ({
    text,
    options: {
      breakLine: index < lines.length - 1,
      bullet: element.list === 'number' ? { type: 'number' } : { type: 'bullet' },
    },
  })), options);
}

function addShape(pptx: PptxGenJS, slide: PptxGenJS.Slide, element: SlideElement) {
  const line = {
    color: color(element.stroke, '277F60'),
    width: Math.max(0.1, (element.strokeWidth || 0) * 0.75),
    transparency: element.strokeWidth ? transparency(element.opacity) : 100,
    ...(element.type === 'arrow' ? { endArrowType: 'triangle' as const } : {}),
  };
  if (element.type === 'line' || element.type === 'arrow') {
    slide.addShape(pptx.ShapeType.line, { ...position(element), objectName: element.id, line });
    return;
  }
  const shapeType = element.type === 'ellipse' ? pptx.ShapeType.ellipse
    : element.cornerRadius ? pptx.ShapeType.roundRect : pptx.ShapeType.rect;
  slide.addShape(shapeType, {
    ...position(element), objectName: element.id,
    fill: { color: color(element.fill, 'FFFFFF'), transparency: transparency(element.opacity) }, line,
  });
}

export async function createPptx(doc: SlideDocument, deckId: string, token: string) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'GradeUp';
  pptx.company = 'CareerIQ';
  pptx.subject = 'GradeUp presentation';
  pptx.title = doc.title;
  pptx.revision = '1';
  pptx.theme = {
    headFontFace: doc.theme.font_family || 'Arial',
    bodyFontFace: doc.theme.font_family || 'Arial',
  };
  for (const source of doc.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: color(source.background, 'FFFFFF') };
    for (const element of source.elements) {
      if (element.type === 'text') addText(slide, element);
      else if (element.type === 'image') {
        if (!element.assetId) continue;
        const data = await cropImage(await assetDataUrl(deckId, element.assetId, token), element.crop);
        slide.addImage({ data, ...position(element), objectName: element.id,
          transparency: transparency(element.opacity), altText: element.id });
      } else addShape(pptx, slide, element);
    }
    if (source.notes.trim()) slide.addNotes(source.notes);
  }
  return pptx;
}

export async function exportPptx(doc: SlideDocument, deckId: string, token: string) {
  const pptx = await createPptx(doc, deckId, token);
  await pptx.writeFile({ fileName: `${safeFileName(doc.title)}.pptx`, compression: true });
}
