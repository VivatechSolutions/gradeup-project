import { buildApiUrl } from "./apiBase";

export async function requestLivekitToken(
  path: "/api/v1/debate/room/livekit-token" | "/api/v1/seminar/livekit-token",
  payload: { sessionId: string; candidateId: string; candidateName: string; role?: "host" | "observer" },
  signal?: AbortSignal,
): Promise<{ token: string; livekitUrl: string }> {
  // Use the same origin and cookie policy as login and /auth/me.
  const response = await fetch(buildApiUrl(path), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (response.status === 401) {
    throw new Error("Authentication required. Please sign in again to join the live room.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || `Unable to join the live room (${response.status}). Please try again.`);
  }
  if (typeof body?.data?.token !== "string" || !body.data.token ||
      typeof body?.data?.livekitUrl !== "string" || !body.data.livekitUrl) {
    throw new Error("The server returned incomplete LiveKit connection details. Please try again.");
  }
  return body.data;
}
