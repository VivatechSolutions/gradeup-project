import React, { useEffect, useRef, useState } from 'react';
import { Check, X, Send, ImagePlus } from 'lucide-react';
import { Deck } from './types';
import './AIChatPanel.css';
export default function AIChatPanel({ deck, slideId, busy, send, decide, insertImage }: { deck: Deck; slideId: string; busy: boolean; send: (query: string) => Promise<void>; decide: (decision: string) => void; insertImage: (messageId: string, index: number, slideId: string) => void }) {
  const [query, setQuery] = useState(''); const [pendingQuery, setPendingQuery] = useState(''); const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [deck.messages.length, busy, pendingQuery]);
  const p = deck.proposal;
  return <section className="se-chat"><div className="se-chat-heading"><h3>Copilot</h3><span>{deck.sessionEnded ? 'Session ended' : `Slide ${deck.slides.findIndex(s => s.id === slideId) + 1}`}</span></div>
    <div className="se-messages">{deck.messages.map(m => <article key={m.id} className={`se-message ${m.role}`}><span>{m.role === 'user' ? 'You' : 'GradeUp'}</span><p>{m.text}</p>{m.suggestions?.length ? <ul>{m.suggestions.map((v, i) => <li key={i}>{v}</li>)}</ul> : null}
      {!!m.images?.length && <div className="se-image-results">{m.images.map((image, i) => <button key={i} disabled={busy || !!p || !m.slideId || !deck.slides.some(s => s.id === m.slideId)} onClick={() => insertImage(m.id, i, m.slideId!)} title={`Insert ${image.title || 'image'} into the original slide`}><img src={image.url} alt={image.title || 'Image result'} loading="lazy" referrerPolicy="no-referrer" /><span><ImagePlus size={13} />{image.title || `Image ${i + 1}`}</span></button>)}</div>}
    </article>)}
    {pendingQuery && <article className="se-message user se-pending-message"><span>You</span><p>{pendingQuery}</p></article>}
    {p && <article className="se-proposal"><strong>Preview ready</strong><p>The proposed change is shown on Slide {deck.slides.findIndex(s => s.id === p.slideId) + 1}. Do you want to apply this change?</p><div className="se-inline"><button disabled={busy || p.baseRevision !== deck.revision || !p.preview.slide} onClick={() => decide('approve')}><Check size={16} />Apply changes</button><button disabled={busy} onClick={() => decide('reject')}><X size={16} />Reject</button><button disabled={busy} onClick={() => decide('skip')}>Cancel</button></div>{p.baseRevision !== deck.revision && <p>The deck changed. Cancel this preview and request a fresh one.</p>}</article>}
    {busy && <article className="se-message se-thinking-message"><span>GradeUp</span><div className="se-thinking-dots" role="status" aria-label="GradeUp is thinking"><i /><i /><i /></div></article>}<div ref={end} /></div>
    <form onSubmit={async e => { e.preventDefault(); const value = query.trim(); if (value && !p && !busy) { setQuery(''); setPendingQuery(value); try { await send(value); } finally { setPendingQuery(''); } } }}><textarea aria-label="Message Copilot" placeholder={p ? 'Apply or dismiss the preview to continue...' : 'Ask about this slide...'} maxLength={500} value={query} onChange={e => setQuery(e.target.value)} disabled={busy || !!p || deck.sessionEnded} /><button title="Send message" aria-label="Send message" disabled={busy || !!p || !query.trim() || deck.sessionEnded}><Send size={18} /></button></form>
  </section>;
}
