import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { ArrowLeft, Undo2, Redo2, Type, ImagePlus, Square, Circle, ArrowUpRight, Minus, Plus, Trash2, Copy, Bold, Italic, Underline, Layers, Group, Ungroup, Play, Share2, Save, ChevronLeft, ChevronRight, X, AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical, GalleryHorizontalEnd, GalleryVerticalEnd, History, Check } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';
import { API_BASE_URL } from '../lib/apiBase';
import { useEditor } from '../components/slide-editor/store';
import { Deck, ElementType, SlideElement, blankSlide, copy, HEIGHT, newElement, placeElement, uid, WIDTH } from '../components/slide-editor/types';
import { EditorError, editorApi } from '../components/slide-editor/api';
import SlideCanvas from '../components/slide-editor/SlideCanvas';
import PropertiesPanel from '../components/slide-editor/PropertiesPanel';
import AIChatPanel from '../components/slide-editor/AIChatPanel';
import ShareDialog from '../components/slide-editor/ShareDialog';
import { download, exportPdf, renderSlide } from '../components/slide-editor/export';
import { exportPptx } from '../components/slide-editor/pptx';
import './slide-editor.css';

function Tool({ label, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) { return <button type="button" title={label} aria-label={label} {...props}>{children}</button>; }
export default function SlideEditorPage() {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id || user?._id;
  const deckId = window.location.pathname.split('/')[3] || '';
  const shareToken = new URLSearchParams(window.location.search).get('share') || '';
  const presentRoute = window.location.pathname.endsWith('/present');
  const state = useEditor(), { deck, document: doc, selectedSlide, selected, change, initialize } = state;
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [saving, setSaving] = useState(false), [conflict, setConflict] = useState(false), [saveFailed, setSaveFailed] = useState(false);
  const [sharing, setSharing] = useState(false), [presenting, setPresenting] = useState(presentRoute), [tab, setTab] = useState('chat'), [zoom, setZoom] = useState(0), [fit, setFit] = useState(.6), [snap, setSnap] = useState(true), [people, setPeople] = useState(1), [revisions, setRevisions] = useState<any[] | null>(null), [recent, setRecent] = useState<any[] | null>(null);
  const viewport = useRef<HTMLDivElement>(null), file = useRef<HTMLInputElement>(null), clipboard = useRef<SlideElement[]>([]), savingPromise = useRef<Promise<void> | null>(null), replacing = useRef(false), dragged = useRef('');
  const api = useCallback(<T = any,>(suffix: string, body?: unknown, method?: string) => editorApi<T>(`/decks/${deckId}${suffix}`, body, method, shareToken), [deckId, shareToken]);
  const dirty = state.generation !== state.savedGeneration;
  const hasDeck = !!deck;
  const slide = doc?.slides.find(s => s.id === selectedSlide) || doc?.slides[0];
  const editable = !!deck && deck.role !== 'viewer' && !busy && !conflict;
  const selectedElement = slide?.elements.find(e => selected.includes(e.id));
  const refresh = useCallback(async () => { const fresh = await api<Deck>(''); initialize(fresh); setConflict(false); setSaveFailed(false); }, [api, initialize]);
  useEffect(() => {
    useEditor.setState({ deck: null, document: null });
    if (userId) refresh().catch(e => setError(e.message));
  }, [refresh, userId]);
  useEffect(() => {
    if (!viewport.current) return;
    const observer = new ResizeObserver(entries => { const r = entries[0].contentRect; setFit(Math.max(.08, Math.min((r.width - 48) / WIDTH, (r.height - 48) / HEIGHT))); });
    observer.observe(viewport.current); return () => observer.disconnect();
  }, [hasDeck, presenting]);
  const save = useCallback(async () => {
    if (savingPromise.current) { await savingPromise.current; return; }
    const s = useEditor.getState();
    if (!s.deck || !s.document || s.generation === s.savedGeneration) return;
    if (conflict) throw new Error('Reload the latest version before continuing');
    setSaving(true);
    const promise = (async () => {
      try {
        const result = await api<Deck>('', { ...s.document, base_revision: s.deck!.revision, mutation_id: uid() }, 'PATCH');
        useEditor.getState().acknowledge(result, s.generation); setSaveFailed(false);
      } catch (e: any) { setSaveFailed(true); if (e instanceof EditorError && [409,403].includes(e.status)) setConflict(true); setError(e.message); throw e; }
      finally { setSaving(false); savingPromise.current = null; }
    })(); savingPromise.current = promise; await promise;
  }, [api, conflict]);
  useEffect(() => { if (!dirty || busy || conflict || saveFailed) return; const timer = setTimeout(() => { save().catch(() => {}); }, 700); return () => clearTimeout(timer); }, [state.generation, state.savedGeneration, dirty, busy, conflict, saveFailed, save]);
  useEffect(() => { const warn = (e: BeforeUnloadEvent) => { const s = useEditor.getState(); if (s.generation !== s.savedGeneration) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, []);
  useEffect(() => {
    if (!user || !deckId) return;
    const socket = io(API_BASE_URL || undefined, { withCredentials: true });
    socket.on('connect', () => socket.emit('presentation:join', { deckId, shareToken }));
    const sync = async () => {
      if (savingPromise.current) return;
      try {
        const fresh = await api<Deck>(''); const current = useEditor.getState();
        if (!current.deck || fresh.revision === current.deck.revision) return;
        if (current.generation !== current.savedGeneration) { setConflict(true); setError('Another editor saved changes. Download your draft or reload the latest version.'); }
        else initialize(fresh);
      } catch (e: any) { if (e.status === 403 || e.status === 404) { useEditor.setState({ deck: null, document: null }); setError(e.message); } }
    };
    socket.on('presentation:changed', sync); socket.on('presentation:access-changed', () => { sync(); socket.emit('presentation:join', { deckId, shareToken }); });
    socket.on('presentation:presence', ({ count }) => setPeople(count));
    const timer = setInterval(sync, 10000);
    return () => { clearInterval(timer); socket.disconnect(); };
  }, [user, deckId, shareToken, api, initialize]);
  function chooseSlide(id: string) { useEditor.setState({ selectedSlide: id, selected: [] }); }
  function modifyElements(fn: (elements: SlideElement[]) => SlideElement[]) { if (!slide) return; const target = slide.id; change(d => { const s = d.slides.find(v => v.id === target); if (s) s.elements = fn(s.elements); }); }
  function update(patch: Partial<SlideElement>) { modifyElements(es => es.map(e => selected.includes(e.id) ? { ...e, ...patch } : e)); }
  function removeElements() { modifyElements(es => es.filter(e => !selected.includes(e.id))); useEditor.setState({ selected: [] }); }
  function paste() { const groupMap = new Map<string,string>(); const values = clipboard.current.map(e => ({ ...copy(e), id: uid(), x: e.x + 20, y: e.y + 20, groupId: e.groupId ? (groupMap.get(e.groupId) || (groupMap.set(e.groupId, uid()), groupMap.get(e.groupId))) : null })); modifyElements(es => [...es, ...values]); useEditor.setState({ selected: values.map(e => e.id) }); }
  function duplicate() { clipboard.current = copy(slide?.elements.filter(e => selected.includes(e.id)) || []); paste(); }
  function addElement(type: ElementType) { const element = placeElement(newElement(type), slide?.elements || []); modifyElements(es => [...es, element]); useEditor.setState({ selected: [element.id] }); setTab('properties'); }
  function addSlide(duplicateSlide = false) { const next = duplicateSlide && slide ? { ...copy(slide), id: uid(), elements: slide.elements.map(e => ({ ...copy(e), id: uid() })) } : blankSlide(); change(d => d.slides.splice(slide ? d.slides.findIndex(v => v.id === slide.id) + 1 : d.slides.length, 0, next)); chooseSlide(next.id); }
  function removeSlide() { if (!slide || !doc || doc.slides.length <= 1) return; const next = doc.slides.find(s => s.id !== slide.id)!; change(d => { d.slides = d.slides.filter(s => s.id !== slide.id); }); chooseSlide(next.id); }
  function align(axis: 'x' | 'y', mode: 'start' | 'center' | 'end' | 'distribute') {
    if (!slide) return; const elements = slide.elements.filter(e => selected.includes(e.id)); if (!elements.length) return;
    const dim = axis === 'x' ? 'width' : 'height', extent = axis === 'x' ? WIDTH : HEIGHT;
    const min = elements.length === 1 ? 0 : Math.min(...elements.map(e => e[axis])), max = elements.length === 1 ? extent : Math.max(...elements.map(e => e[axis] + e[dim]));
    const sorted = [...elements].sort((a,b) => a[axis] - b[axis]); let cursor = min;
    const gap = (max - min - elements.reduce((n,e) => n + e[dim], 0)) / Math.max(1, elements.length - 1), positions = new Map<string,number>();
    sorted.forEach(e => { positions.set(e.id, mode === 'start' ? min : mode === 'center' ? (min + max - e[dim]) / 2 : mode === 'end' ? max - e[dim] : cursor); cursor += e[dim] + gap; });
    modifyElements(es => es.map(e => positions.has(e.id) ? { ...e, [axis]: positions.get(e.id) } : e));
  }
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]')) return;
      if (presenting && doc) {
        if (event.key === 'Escape') { setPresenting(false); documentExit(); }
        if (['ArrowLeft','ArrowRight',' '].includes(event.key)) { event.preventDefault(); const i = doc.slides.findIndex(s => s.id === slide?.id); chooseSlide(doc.slides[Math.max(0, Math.min(doc.slides.length - 1, i + (event.key === 'ArrowLeft' ? -1 : 1)))].id); } return;
      }
      if (!editable) return;
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? state.redo() : state.undo(); }
      else if (mod && event.key.toLowerCase() === 'y') { event.preventDefault(); state.redo(); }
      else if (mod && event.key.toLowerCase() === 'a') { event.preventDefault(); useEditor.setState({ selected: slide?.elements.map(e => e.id) || [] }); }
      else if (mod && event.key.toLowerCase() === 'c') { event.preventDefault(); clipboard.current = copy(slide?.elements.filter(e => selected.includes(e.id)) || []); }
      else if (mod && event.key.toLowerCase() === 'v') { event.preventDefault(); paste(); }
      else if (mod && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicate(); }
      else if (mod && event.key.toLowerCase() === 's') { event.preventDefault(); save().catch(() => {}); }
      else if (['Delete','Backspace'].includes(event.key)) { event.preventDefault(); removeElements(); }
      else if (event.key.startsWith('Arrow')) { event.preventDefault(); const delta = event.shiftKey ? 10 : 1; modifyElements(es => es.map(e => selected.includes(e.id) ? { ...e, x: e.x + (event.key === 'ArrowLeft' ? -delta : event.key === 'ArrowRight' ? delta : 0), y: e.y + (event.key === 'ArrowUp' ? -delta : event.key === 'ArrowDown' ? delta : 0) } : e)); }
    }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  });
  function documentExit() { if (window.document.fullscreenElement) window.document.exitFullscreen().catch(() => {}); }
  const run = async (fn: () => Promise<void>) => { if (busy) return; setBusy(true); setError(''); try { await fn(); } catch (e: any) { setError(e.message); if (e.status === 409) setConflict(true); } finally { setBusy(false); } };
  async function flush() { await save(); if (useEditor.getState().generation !== useEditor.getState().savedGeneration) await save(); }
  async function ai(query: string) { await run(async () => { await flush(); const s = useEditor.getState(); const result = await api<Deck>('/ai/suggest', { query, slide_id: slide?.id, selected_element_ids: selected, base_revision: s.deck!.revision, mutation_id: uid() }); initialize(result); }); }
  async function decide(decision: string) { await run(async () => { await flush(); const s = useEditor.getState(); initialize(await api<Deck>('/ai/decide', { proposal_id: s.deck?.proposal?.id, decision, base_revision: s.deck!.revision, mutation_id: uid() })); }); }
  async function insertImage(messageId: string, index: number, targetSlide: string) { await run(async () => {
    const result = await api<{ assetId: string }>('/assets/import', { message_id: messageId, image_index: index });
    const element = { ...newElement('image'), assetId: result.assetId, width: 480, height: 320 };
    change(d => { const target = d.slides.find(s => s.id === targetSlide); if (target) target.elements.push(placeElement(element, target.elements)); }); chooseSlide(targetSlide); useEditor.setState({ selected: [element.id] }); await flush();
  }); }
  async function uploadImage(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0]; event.target.value = ''; if (!selectedFile || !slide) return;
    const target = slide.id, replaceId = replacing.current ? selectedElement?.id : null; replacing.current = false;
    await run(async () => { const form = new FormData(); form.append('file', selectedFile); const result = await api<{assetId:string}>('/assets', form);
      const element = { ...newElement('image'), assetId: result.assetId, width: 480, height: 320 };
      change(d => { const s = d.slides.find(s => s.id === target); if (!s) return; const old = s.elements.find(e => e.id === replaceId); if (old) { old.assetId = result.assetId; old.crop = { x: 0, y: 0, width: 1, height: 1 }; } else s.elements.push(placeElement(element, s.elements)); }); await flush();
    });
  }
  const draftDownload = () => doc && download(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }), `${doc.title}-draft.json`);
  if (authLoading) return <main className="se-entry"><h1>GradeUp Slides</h1><p role="status">Checking your GradeUp account...</p></main>;
  if (!user) return <main className="se-entry"><h1>GradeUp Slides</h1><p>Sign in to open this presentation.</p><button onClick={() => { localStorage.setItem('gradeup_post_auth_redirect', window.location.pathname + window.location.search); window.location.href = '/auth'; }}>Sign in</button></main>;
  if (!deck || !doc || !slide) return <main className="se-entry"><h1>GradeUp Slides</h1><p role="status">{error || 'Preparing your presentation...'}</p>{error && <button type="button" onClick={() => { setError(''); refresh().catch(e => setError(e.message)); }}>Retry</button>}<a href="/seminarPage">Back to seminar</a></main>;
  const scale = presenting || !zoom ? fit : zoom;
  return <main className={`se-app ${presenting ? 'se-presenting' : ''}`}>
    {!presenting && <>
      <header className="se-header"><a href="/seminarPage" title="Back to seminar"><ArrowLeft size={19} /></a><span className="se-brand">GradeUp <b>Slides</b></span><input className="se-deck-title" aria-label="Presentation title" value={doc.title} disabled={!editable} maxLength={200} onChange={e => change(d => { d.title = e.target.value; })} /><span className="se-save-state" role="status">{saving ? 'Saving...' : conflict ? 'Conflict' : dirty ? 'Unsaved' : 'Saved'}</span><span className="se-people">{people} online</span>
      <Tool label="Save" disabled={!editable || saving} onClick={() => save().catch(() => {})}><Save size={18} /></Tool>
      <Tool label="Recent presentations" onClick={() => run(async () => setRecent(await editorApi('/decks')))}><Layers size={18} /></Tool>
      <Tool label="Present" onClick={() => { setPresenting(true); window.document.documentElement.requestFullscreen?.().catch(() => {}); }}><Play size={18} /></Tool>
      {deck.role === 'owner' && <button onClick={() => run(async () => { await flush(); setSharing(true); })}><Share2 size={17} />Share</button>}
      </header>
      <div className="se-toolbar"><Tool label="Undo" disabled={!editable || !state.past.length} onClick={state.undo}><Undo2 size={18} /></Tool><Tool label="Redo" disabled={!editable || !state.future.length} onClick={state.redo}><Redo2 size={18} /></Tool><i />
        {([['text', Type], ['rect', Square], ['ellipse', Circle], ['line', Minus], ['arrow', ArrowUpRight]] as const).map(([type, Icon]) => <Tool key={type} label={`Insert ${type}`} disabled={!editable} onClick={() => addElement(type)}><Icon size={18} /></Tool>)}
        <Tool label="Insert image" disabled={!editable} onClick={() => file.current?.click()}><ImagePlus size={18} /></Tool><input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={uploadImage} /><i />
        <Tool label="Bold" disabled={!editable || !selected.length} aria-pressed={!!selectedElement?.bold} onClick={() => update({ bold: !selectedElement?.bold })}><Bold size={18} /></Tool><Tool label="Italic" disabled={!editable || !selected.length} aria-pressed={!!selectedElement?.italic} onClick={() => update({ italic: !selectedElement?.italic })}><Italic size={18} /></Tool><Tool label="Underline" disabled={!editable || !selected.length} aria-pressed={!!selectedElement?.underline} onClick={() => update({ underline: !selectedElement?.underline })}><Underline size={18} /></Tool><i />
        <Tool label="Duplicate selection" disabled={!editable || !selected.length} onClick={duplicate}><Copy size={18} /></Tool><Tool label="Delete selection" disabled={!editable || !selected.length} onClick={removeElements}><Trash2 size={18} /></Tool>
        <Tool label="Group selection" disabled={!editable || selected.length < 2} onClick={() => update({ groupId: uid() })}><Group size={18} /></Tool><Tool label="Ungroup selection" disabled={!editable || !selected.length} onClick={() => update({ groupId: null })}><Ungroup size={18} /></Tool>
        <select aria-label="Layer order" value="" disabled={!editable || !selected.length} onChange={e => modifyElements(es => e.target.value === 'front' ? [...es.filter(v => !selected.includes(v.id)), ...es.filter(v => selected.includes(v.id))] : [...es.filter(v => selected.includes(v.id)), ...es.filter(v => !selected.includes(v.id))])}><option value="">Arrange</option><option value="front">Bring to front</option><option value="back">Send to back</option></select>
        <select aria-label="Zoom" value={zoom} onChange={e => setZoom(Number(e.target.value))}><option value={0}>Fit</option>{[.25,.5,.75,1,1.5,2].map(v => <option key={v} value={v}>{v * 100}%</option>)}</select><label className="se-check"><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)} />Snap</label>
        <select aria-label="Export presentation" value="" disabled={busy} onChange={e => { const format = e.target.value; run(async () => { if (format === 'json') draftDownload(); else if (format === 'pdf') await exportPdf(doc, deckId, shareToken); else if (format === 'pptx') await exportPptx(doc, deckId, shareToken); else { const url = await renderSlide(slide, deckId, shareToken); const a = window.document.createElement('a'); a.href = url; a.download = `${slide.title}.png`; a.click(); } }); }}><option value="">Export</option><option value="pptx">PowerPoint (.pptx)</option><option value="png">Slide PNG</option><option value="pdf">Deck PDF</option><option value="json">Editable JSON</option></select>
      </div>
    </>}
    {error && <div className="se-error" role="alert"><span>{error}</span>{conflict && <><button onClick={draftDownload}>Download draft</button><button onClick={() => { if (window.confirm('Discard local changes and load the saved presentation?')) refresh().then(() => setError('')).catch(e => setError(e.message)); }}>Reload latest</button></>}<Tool label="Dismiss message" onClick={() => setError('')}><X size={16} /></Tool></div>}
    <div className="se-workspace">
      {!presenting && <nav className="se-slides" aria-label="Slides"><div className="se-inline"><Tool label="Add slide" disabled={!editable || doc.slides.length >= 50} onClick={() => addSlide()}><Plus size={18} /></Tool><Tool label="Duplicate slide" disabled={!editable || doc.slides.length >= 50} onClick={() => addSlide(true)}><Copy size={16} /></Tool><Tool label="Delete slide" disabled={!editable || doc.slides.length < 2} onClick={removeSlide}><Trash2 size={16} /></Tool></div>{doc.slides.map((s, i) => <button key={s.id} className={`se-thumbnail ${s.id === slide.id ? 'active' : ''}`} aria-label={`Slide ${i + 1}: ${s.title}`} aria-current={s.id === slide.id ? 'true' : undefined} draggable={editable} onDragStart={() => { dragged.current = s.id; }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!editable) return; const from = dragged.current; change(d => { const source = d.slides.findIndex(v => v.id === from), target = d.slides.findIndex(v => v.id === s.id); if (source >= 0) d.slides.splice(target, 0, d.slides.splice(source, 1)[0]); }); }} onClick={() => chooseSlide(s.id)}><div className="se-thumbnail-canvas"><SlideCanvas slide={s} deckId={deckId} token={shareToken} scale={.12} readOnly /></div><span>{i + 1}. {s.title || 'Untitled'}</span></button>)}</nav>}
      <section className="se-center"><div className="se-stage-space" ref={viewport}><SlideCanvas slide={slide} deckId={deckId} token={shareToken} scale={scale} selected={presenting ? [] : selected} onSelect={ids => useEditor.setState({ selected: ids })} onChange={elements => { if (editable) modifyElements(() => elements); }} readOnly={!editable || presenting} snap={snap} /></div>
        {!presenting && <><div className="se-selection-tools">{([['x','start',AlignLeft],['x','center',AlignCenter],['x','end',AlignRight],['y','start',AlignStartVertical],['y','center',AlignCenterVertical],['y','end',AlignEndVertical],['x','distribute',GalleryHorizontalEnd],['y','distribute',GalleryVerticalEnd]] as const).map(([axis, mode, Icon]) => <Tool key={axis + mode} label={`${mode} ${axis === 'x' ? 'horizontally' : 'vertically'}`} disabled={!editable || !selected.length} onClick={() => align(axis, mode)}><Icon size={16} /></Tool>)}<span>Slide {doc.slides.indexOf(slide) + 1} of {doc.slides.length}</span>{selectedElement?.type === 'image' && <button disabled={!editable} onClick={() => { replacing.current = true; file.current?.click(); }}>Replace image</button>}</div><label className="se-notes">Speaker notes<textarea aria-label="Speaker notes" disabled={!editable} maxLength={20000} value={slide.notes} onChange={e => change(d => { d.slides.find(v => v.id === slide.id)!.notes = e.target.value; })} /></label></>}
      </section>
      {!presenting && <aside className="se-inspector"><div className="se-tabs" role="tablist">{['chat','properties','theme'].map(v => <button role="tab" aria-selected={tab === v} key={v} onClick={() => setTab(v)}>{v === 'chat' ? 'Copilot' : v[0].toUpperCase() + v.slice(1)}</button>)}</div>
        {tab === 'chat' && (deck.role === 'viewer' ? <p className="se-viewer-note">Viewer access</p> : <AIChatPanel deck={deck} slideId={slide.id} busy={busy || conflict} send={ai} decide={decide} insertImage={insertImage} />)}
        {tab === 'properties' && <fieldset disabled={!editable} className="se-property-fieldset"><PropertiesPanel slide={slide} element={selectedElement} update={update} updateSlide={patch => change(d => Object.assign(d.slides.find(s => s.id === slide.id)!, patch))} /></fieldset>}
        {tab === 'theme' && <section className="se-theme"><h3>Deck theme</h3><fieldset disabled={!editable}>{[['background_hex','Background','#ffffff'],['title_color_hex','Title','#17251f'],['body_color_hex','Body','#263b32'],['accent_hex','Accent','#277f60']].map(([key, label, fallback]) => <label key={key}>{label}<input type="color" value={doc.theme[key] || fallback} onChange={e => change(d => { d.theme[key] = e.target.value; })} /></label>)}<button onClick={() => change(d => { d.slides.forEach(s => { s.background = d.theme.background_hex || '#ffffff'; s.elements.forEach(e => { if (e.type === 'text') e.fill = (e.fontSize || 32) >= 36 ? d.theme.title_color_hex || '#17251f' : d.theme.body_color_hex || '#263b32'; }); }); })}><Check size={16} />Apply to all slides</button></fieldset>
        <button disabled={busy || deck.role === 'viewer'} onClick={() => run(async () => { await flush(); setRevisions(await api('/revisions')); })}><History size={16} />Saved revisions</button>
        {deck.role === 'owner' && <button disabled={busy || deck.sessionEnded} onClick={() => { if (window.confirm('End AI coaching for this deck? Manual editing will remain available.')) run(async () => { await flush(); const s = useEditor.getState(); initialize(await api('/session/end', { base_revision: s.deck!.revision, mutation_id: uid() })); }); }}>End AI session</button>}
        </section>}
      </aside>}
    </div>
    {presenting && <footer className="se-present-controls"><Tool label="Previous slide" disabled={doc.slides.indexOf(slide) === 0} onClick={() => chooseSlide(doc.slides[doc.slides.indexOf(slide) - 1].id)}><ChevronLeft /></Tool><span>{doc.slides.indexOf(slide) + 1} / {doc.slides.length}</span><Tool label="Next slide" disabled={doc.slides.indexOf(slide) === doc.slides.length - 1} onClick={() => chooseSlide(doc.slides[doc.slides.indexOf(slide) + 1].id)}><ChevronRight /></Tool><Tool label="Exit presentation" onClick={() => { setPresenting(false); documentExit(); }}><X /></Tool></footer>}
    {sharing && <ShareDialog deck={deck} close={() => setSharing(false)} refresh={() => refresh().catch(e => setError(e.message))} />}
    {(revisions || recent) && <div className="se-overlay"><section className="se-dialog" role="dialog" aria-label={recent ? 'Recent presentations' : 'Saved revisions'}><header><h2>{recent ? 'Presentations' : 'Saved revisions'}</h2><Tool label="Close" onClick={() => { setRecent(null); setRevisions(null); }}><X /></Tool></header>{recent ? recent.map(v => <a className="se-share-row" key={v.deckId} href={v.editUrl}>{v.title}</a>) : revisions!.map(v => <div className="se-share-row" key={v.revision}><span>Revision {v.revision}</span><small>{new Date(v.at).toLocaleString()}</small><button disabled={busy} onClick={() => { if (window.confirm('Restore this saved revision?')) run(async () => { const s = useEditor.getState(); initialize(await api(`/revisions/${v.revision}/restore`, { base_revision: s.deck!.revision, mutation_id: uid() })); setRevisions(null); }); }}>Restore</button></div>)}</section></div>}
  </main>;
}
