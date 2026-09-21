import React from 'react';
import { Slide, SlideElement } from './types';
export default function PropertiesPanel({ slide, element, update, updateSlide }: { slide: Slide; element?: SlideElement; update: (patch: Partial<SlideElement>) => void; updateSlide: (patch: Partial<Slide>) => void }) {
  const number = (label: string, key: keyof SlideElement, fallback: number, min: number, max: number, step = 1) => <label>{label}<input aria-label={label} type="number" min={min} max={max} step={step} value={Number(element?.[key] ?? fallback)} onChange={e => { if (e.target.value !== '') update({ [key]: Math.min(max, Math.max(min, Number(e.target.value))) }); }} /></label>;
  return <section className="se-properties">
    <h3>{element ? 'Selection' : 'Slide'}</h3>
    <label>Slide title<input value={slide.title} maxLength={200} onChange={e => updateSlide({ title: e.target.value })} /></label>
    <label>Background<input aria-label="Slide background" type="color" value={slide.background} onChange={e => updateSlide({ background: e.target.value })} /></label>
    {element && <>
      <div className="se-fields">{number('X', 'x', 100, -4000, 8000)}{number('Y', 'y', 100, -4000, 8000)}{number('Width', 'width', 240, 4, 8000)}{number('Height', 'height', 180, 4, 8000)}{number('Rotation', 'rotation', 0, -360, 360)}{number('Opacity', 'opacity', 1, 0, 1, .05)}</div>
      <label>Fill<input aria-label="Fill color" type="color" value={element.fill === 'transparent' ? '#ffffff' : element.fill || '#17251f'} onChange={e => update({ fill: e.target.value })} /></label>
      <label>Border<input aria-label="Border color" type="color" value={element.stroke || '#277f60'} onChange={e => update({ stroke: e.target.value })} /></label>
      {number('Border width', 'strokeWidth', 0, 0, 50)}
      {element.type === 'rect' && number('Corner radius', 'cornerRadius', 0, 0, 500)}
      {element.type === 'text' && <>
        <label>Text<textarea aria-label="Selected text" value={element.text || ''} maxLength={20000} onChange={e => update({ text: e.target.value })} /></label>
        <label>Font<select value={element.fontFamily || 'Arial'} onChange={e => update({ fontFamily: e.target.value })}>{['Arial','Verdana','Georgia','Times New Roman','Courier New','Trebuchet MS'].map(f => <option key={f}>{f}</option>)}</select></label>
        {number('Font size', 'fontSize', 32, 6, 300)}{number('Line spacing', 'lineHeight', 1.2, .5, 4, .1)}
        <label>Alignment<select value={element.align || 'left'} onChange={e => update({ align: e.target.value as any })}>{['left','center','right','justify'].map(v => <option key={v}>{v}</option>)}</select></label>
        <label>List<select value={element.list || 'none'} onChange={e => update({ list: e.target.value as any })}>{['none','bullet','number'].map(v => <option key={v}>{v}</option>)}</select></label>
      </>}
      {element.type === 'image' && <fieldset><legend>Image crop</legend>{(['x','y','width','height'] as const).map(key => <label key={key}>{key}<input aria-label={`Crop ${key}`} type="range" min={key === 'width' || key === 'height' ? .05 : 0} max={1} step={.01} value={element.crop?.[key] ?? (key === 'width' || key === 'height' ? 1 : 0)} onChange={e => {
        const crop = { x: 0, y: 0, width: 1, height: 1, ...element.crop, [key]: Number(e.target.value) };
        crop.x = Math.min(crop.x, .95); crop.y = Math.min(crop.y, .95); crop.width = Math.min(crop.width, 1 - crop.x); crop.height = Math.min(crop.height, 1 - crop.y); update({ crop });
      }} /></label>)}<button onClick={() => update({ crop: { x: 0, y: 0, width: 1, height: 1 } })}>Reset crop</button></fieldset>}
    </>}
  </section>;
}
