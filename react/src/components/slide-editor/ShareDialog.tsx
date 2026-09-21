import React, { useEffect, useState } from 'react';
import { X, Copy, Link, Trash2 } from 'lucide-react';
import { Deck } from './types';
import { editorApi } from './api';
export default function ShareDialog({ deck, close, refresh }: { deck: Deck; close: () => void; refresh: () => void }) {
  const [role, setRole] = useState('viewer'), [email, setEmail] = useState(''), [links, setLinks] = useState<any[]>([]), [url, setUrl] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const base = `/decks/${deck.deckId}`;
  useEffect(() => { editorApi(`${base}/shares`).then(setLinks).catch(e => setError(e.message)); }, [base]);
  const run = async (fn: () => Promise<void>) => { setBusy(true); setError(''); try { await fn(); } catch (e: any) { setError(e.message); } finally { setBusy(false); } };
  return <div className="se-overlay" onClick={close}><section className="se-dialog" role="dialog" aria-modal="true" aria-label="Share presentation" onClick={e => e.stopPropagation()}><header><h2>Share presentation</h2><button onClick={close} title="Close" aria-label="Close"><X size={18} /></button></header>
    <p>Restricted to you and people you grant access to.</p>
    <div className="se-inline"><input aria-label="Collaborator email" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} /><select aria-label="Permission" value={role} onChange={e => setRole(e.target.value)}><option value="viewer">Viewer</option><option value="editor">Editor</option></select><button disabled={busy || !email} onClick={() => run(async () => { await editorApi(`${base}/collaborators`, { email, role }); setEmail(''); refresh(); })}>Add</button></div>
    {deck.collaborators.map(c => <div className="se-share-row" key={c.userId}><span>{c.email}</span><span>{c.role}</span><button disabled={busy} title="Remove access" onClick={() => run(async () => { await editorApi(`${base}/collaborators`, { email: c.email, role: 'remove' }); refresh(); })}><Trash2 size={16} /></button></div>)}
    <hr /><button disabled={busy} onClick={() => run(async () => { const link = await editorApi(`${base}/shares`, { role }); setUrl(link.url); setLinks(await editorApi(`${base}/shares`)); })}><Link size={16} />Create {role} link</button><p>Links expire after 30 days. Recipients sign in to GradeUp.</p>
    {url && <div className="se-inline"><input aria-label="Share URL" value={url} readOnly /><button title="Copy share link" onClick={() => run(async () => navigator.clipboard.writeText(url))}><Copy size={16} /></button></div>}
    {links.map(link => <div className="se-share-row" key={link._id}><span>{link.role} link</span><small>{new Date(link.expiresAt).toLocaleDateString()}</small><button disabled={busy} title="Revoke link" onClick={() => run(async () => { await editorApi(`${base}/shares/${link._id}`, undefined, 'DELETE'); setLinks(links.filter(v => v._id !== link._id)); setUrl(''); })}><Trash2 size={16} /></button></div>)}
    {error && <p role="alert">{error}</p>}
  </section></div>;
}
