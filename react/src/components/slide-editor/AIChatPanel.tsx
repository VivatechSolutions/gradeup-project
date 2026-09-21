import React, { useEffect, useRef, useState } from 'react';
import { Check, X, Send, ImagePlus } from 'lucide-react';
import { Deck } from './types';
export default function AIChatPanel({ deck, slideId, busy, send, decide, insertImage }: { deck: Deck; slideId: string; busy: boolean; send: (query: string) => Promise<void>; decide: (decision: string) => void; insertImage: (messageId: string, index: number, slideId: string) => void }) {
  const [query, setQuery] = useState(''); const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [deck.messages.length, busy]);
  const p = deck.proposal;
  return <section className="se-chat"><div className="se-chat-heading"><h3>Copilot</h3><span>{deck.sessionEnded ? 'Session ended' : `Slide ${deck.slides.findIndex(s => s.id === slideId) + 1}`}</span></div>
    <div className="se-messages">{deck.messages.map(m => <article key={m.id} className={`se-message ${m.role}`}><span>{m.role === 'user' ? 'You' : 'GradeUp'}</span><p>{m.text}</p>{m.suggestions?.length ? <ul>{m.suggestions.map((v, i) => <li key={i}>{v}</li>)}</ul> : null}
      {!!m.images?.length && <div className="se-image-results">{m.images.map((image, i) => <button key={i} disabled={busy || !m.slideId || !deck.slides.some(s => s.id === m.slideId)} onClick={() => insertImage(m.id, i, m.slideId!)} title={`Insert ${image.title || 'image'} into the original slide`}><img src={image.url} alt={image.title || 'Image result'} loading="lazy" referrerPolicy="no-referrer" /><span><ImagePlus size={13} />{image.title || `Image ${i + 1}`}</span></button>)}</div>}
    </article>)}
    {p && <article className="se-proposal"><strong>Proposed changes</strong><p>{p.feedback}</p><span>Slide {deck.slides.findIndex(s => s.id === p.slideId) + 1}</span>{p.operations.map((op, i) => <details key={i} open><summary>{op.op.replace(/_/g, ' ')}</summary><pre>{JSON.stringify(op.element || op.changes || op.slide || op.theme || op.value || op.ids, null, 2)}</pre></details>)}<div className="se-inline"><button disabled={busy || p.baseRevision !== deck.revision} onClick={() => decide('approve')}><Check size={16} />Approve</button><button disabled={busy} onClick={() => decide('reject')}><X size={16} />Reject</button><button disabled={busy} onClick={() => decide('skip')}>Skip</button></div>{p.baseRevision !== deck.revision && <p>The deck changed. Dismiss this proposal and request a fresh one.</p>}</article>}
    {busy && <p role="status">Working...</p>}<div ref={end} /></div>
    <form onSubmit={async e => { e.preventDefault(); const value = query.trim(); if (value) { setQuery(''); await send(value); } }}><textarea aria-label="Message Copilot" placeholder="Ask about this slide..." maxLength={500} value={query} onChange={e => setQuery(e.target.value)} disabled={busy || deck.sessionEnded} /><button title="Send message" aria-label="Send message" disabled={busy || !query.trim() || deck.sessionEnded}><Send size={18} /></button></form>
  </section>;
}
