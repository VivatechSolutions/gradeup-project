import { buildApiUrl } from '../../lib/apiBase';
export class EditorError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function editorApi<T = any>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST', shareToken = ''): Promise<T> {
  const response = await fetch(buildApiUrl(`/api/v1/seminar${path}`), { method, credentials: 'include', headers: { ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(shareToken ? { 'x-presentation-share': shareToken } : {}) }, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.status === false) throw new EditorError(result?.message || 'Unable to complete presentation request', response.status);
  return result.data;
}
export async function assetBlob(deckId: string, assetId: string, token: string) {
  const response = await fetch(buildApiUrl(`/api/v1/seminar/decks/${encodeURIComponent(deckId)}/assets/${encodeURIComponent(assetId)}`), { credentials: 'include', headers: token ? { 'x-presentation-share': token } : {} });
  if (!response.ok) throw new Error('Image unavailable');
  return URL.createObjectURL(await response.blob());
}
