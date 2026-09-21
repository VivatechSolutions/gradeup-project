import React, { useEffect, useRef, useState } from 'react';
import Konva from 'konva';
import { Stage, Layer, Rect, Ellipse, Text, Image as KImage, Arrow, Line, Transformer } from 'react-konva';
import { Slide, SlideElement, WIDTH, HEIGHT } from './types';
import { assetBlob } from './api';

function CanvasImage({ element, deckId, token, ...props }: any) {
  const [image, setImage] = useState<HTMLImageElement>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true, url = ''; setFailed(false); setImage(undefined);
    assetBlob(deckId, element.assetId, token).then(value => {
      url = value;
      if (!active) { URL.revokeObjectURL(url); return; }
      const img = new window.Image(); img.onload = () => active && setImage(img); img.onerror = () => active && setFailed(true); img.src = value;
    }).catch(() => active && setFailed(true));
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [deckId, element.assetId, token]);
  const c = element.crop || { x: 0, y: 0, width: 1, height: 1 };
  return image ? <KImage {...props} image={image} crop={{ x: c.x * image.width, y: c.y * image.height, width: c.width * image.width, height: c.height * image.height }} /> : <Text {...props} fill="#65766e" text={failed ? 'Image unavailable' : 'Loading image...'} fontSize={20} />;
}
interface Props { slide: Slide; deckId: string; token: string; scale: number; selected?: string[]; onSelect?: (ids: string[]) => void; onChange?: (elements: SlideElement[]) => void; readOnly?: boolean; stageRef?: React.RefObject<Konva.Stage>; snap?: boolean; }
export default function SlideCanvas({ slide, deckId, token, scale, selected = [], onSelect, onChange, readOnly, stageRef, snap = true }: Props) {
  const internal = useRef<Konva.Stage>(null), stage = stageRef || internal;
  const transformer = useRef<Konva.Transformer>(null);
  const [editing, setEditing] = useState<string | null>(null), [draft, setDraft] = useState('');
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({});
  useEffect(() => { transformer.current?.nodes(selected.map(id => stage.current?.findOne('#' + id)).filter(Boolean) as Konva.Node[]); transformer.current?.getLayer()?.batchDraw(); }, [selected, slide.elements, stage, readOnly]);
  useEffect(() => { setEditing(null); }, [slide.id]);
  const select = (element: SlideElement, event: any) => {
    if (readOnly) return;
    const ids = element.groupId ? slide.elements.filter(e => e.groupId === element.groupId).map(e => e.id) : [element.id];
    onSelect?.(event.evt.shiftKey ? [...new Set([...selected, ...ids])] : ids);
  };
  const finishTransform = () => {
    const changed = slide.elements.map(e => {
      const node = stage.current?.findOne('#' + e.id);
      if (!node || !selected.includes(e.id)) return e;
      const sx = node.scaleX(), sy = node.scaleY(); node.scaleX(1); node.scaleY(1);
      return { ...e, x: node.x(), y: node.y(), width: Math.max(4, e.width * sx), height: Math.max(4, e.height * sy), rotation: node.rotation() };
    }); onChange?.(changed);
  };
  const editor = slide.elements.find(e => e.id === editing);
  return <div className="se-canvas-wrap" style={{ width: WIDTH * scale, height: HEIGHT * scale }}>
    <Stage ref={stage} width={WIDTH * scale} height={HEIGHT * scale} scaleX={scale} scaleY={scale} onMouseDown={e => { if (e.target === e.target.getStage() || e.target.name() === 'background') onSelect?.([]); }}>
      <Layer><Rect name="background" width={WIDTH} height={HEIGHT} fill={slide.background} />
        {slide.elements.map(e => {
          const common: any = { id: e.id, x: e.x, y: e.y, width: e.width, height: e.height, rotation: e.rotation || 0, opacity: editing === e.id ? 0 : e.opacity ?? 1, fill: e.fill, stroke: e.stroke, strokeWidth: e.strokeWidth || 0, draggable: !readOnly, onClick: (event: any) => select(e, event), onTap: (event: any) => select(e, event), onDragStart: (event: any) => { if (!selected.includes(e.id)) select(e, event); }, onDragMove: (event: any) => {
            if (!snap) return;
            const n = event.target, xs = [0, WIDTH / 2 - e.width / 2, WIDTH - e.width, ...slide.elements.filter(v => v.id !== e.id).map(v => v.x)], ys = [0, HEIGHT / 2 - e.height / 2, HEIGHT - e.height, ...slide.elements.filter(v => v.id !== e.id).map(v => v.y)];
            const x = xs.find(v => Math.abs(v - n.x()) < 6), y = ys.find(v => Math.abs(v - n.y()) < 6);
            if (x !== undefined) n.x(x); if (y !== undefined) n.y(y); setGuides({ x, y });
          }, onDragEnd: (event: any) => {
            setGuides({}); const dx = event.target.x() - e.x, dy = event.target.y() - e.y;
            onChange?.(slide.elements.map(v => v.id === e.id || (selected.includes(e.id) && selected.includes(v.id)) ? { ...v, x: v.x + dx, y: v.y + dy } : v));
          }, onDblClick: () => { if (e.type === 'text' && !readOnly) { setEditing(e.id); setDraft(e.text || ''); } } };
          if (e.type === 'text') return <Text key={e.id} {...common} text={(e.text || '').split('\n').map((line, i) => e.list === 'bullet' ? '\u2022 ' + line : e.list === 'number' ? `${i + 1}. ${line}` : line).join('\n')} fontFamily={e.fontFamily || 'Arial'} fontSize={e.fontSize || 32} fontStyle={`${e.bold ? 'bold ' : ''}${e.italic ? 'italic' : ''}`} textDecoration={e.underline ? 'underline' : ''} align={e.align || 'left'} lineHeight={e.lineHeight || 1.2} wrap="word" />;
          if (e.type === 'image') return <CanvasImage key={e.id} {...common} element={e} deckId={deckId} token={token} />;
          if (e.type === 'ellipse') return <Ellipse key={e.id} {...common} radiusX={e.width / 2} radiusY={e.height / 2} offsetX={-e.width / 2} offsetY={-e.height / 2} />;
          if (e.type === 'line' || e.type === 'arrow') { const C = e.type === 'line' ? Line : Arrow; return <C key={e.id} {...common} points={[0, 0, e.width, e.height]} hitStrokeWidth={15} pointerLength={14} pointerWidth={14} />; }
          return <Rect key={e.id} {...common} cornerRadius={e.cornerRadius || 0} />;
        })}
        {!readOnly && <Transformer ref={transformer} flipEnabled={false} rotateEnabled onTransformEnd={finishTransform} boundBoxFunc={(old, next) => next.width < 4 || next.height < 4 ? old : next} />}
        {guides.x !== undefined && <Line listening={false} points={[guides.x, 0, guides.x, HEIGHT]} stroke="#db5a86" dash={[6, 4]} />}
        {guides.y !== undefined && <Line listening={false} points={[0, guides.y, WIDTH, guides.y]} stroke="#db5a86" dash={[6, 4]} />}
      </Layer>
    </Stage>
    {editor && <textarea autoFocus aria-label="Edit slide text" className="se-text-overlay" value={draft} onChange={e => setDraft(e.target.value)} style={{ left: editor.x * scale, top: editor.y * scale, width: editor.width * scale, height: editor.height * scale, fontFamily: editor.fontFamily, fontSize: (editor.fontSize || 32) * scale, fontWeight: editor.bold ? 700 : 400, fontStyle: editor.italic ? 'italic' : 'normal', lineHeight: editor.lineHeight || 1.2, color: editor.fill, transform: `rotate(${editor.rotation || 0}deg)` }} onBlur={() => { onChange?.(slide.elements.map(e => e.id === editing ? { ...e, text: draft } : e)); setEditing(null); }} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') setEditing(null); }} />}
  </div>;
}
