import { requestLivekitToken } from "./livekitToken";

jest.mock("./apiBase", () => ({ buildApiUrl: (path: string) => `https://api.example${path}` }));
const originalFetch = global.fetch;
const fetchMock = jest.fn();
beforeEach(() => { global.fetch = fetchMock; fetchMock.mockReset(); });
afterAll(() => { global.fetch = originalFetch; });
const payload = { sessionId: "room", candidateId: "student", candidateName: "Student" };

test.each(["/api/v1/debate/room/livekit-token", "/api/v1/seminar/livekit-token"] as const)("%s includes cookies and uses the auth API origin", async path => {
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: { token: "token", livekitUrl: "wss://live.example" } }) });
  const controller = new AbortController();
  const result = await requestLivekitToken(path, payload, controller.signal);
  expect(fetchMock).toHaveBeenCalledWith(`https://api.example${path}`, expect.objectContaining({ credentials: "include", method: "POST", signal: controller.signal, body: JSON.stringify(payload) }));
  expect(result.token).toBe("token");
});
test("401 prompts sign-in without retrying or connecting", async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 401 });
  await expect(requestLivekitToken("/api/v1/debate/room/livekit-token", payload)).rejects.toThrow("Please sign in again");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
test("preserves backend configuration errors", async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => ({ message: "LiveKit is not configured" }) });
  await expect(requestLivekitToken("/api/v1/debate/room/livekit-token", payload)).rejects.toThrow("LiveKit is not configured");
});
test("handles proxy errors and incomplete connection details", async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 502, json: async () => { throw new Error("HTML"); } });
  await expect(requestLivekitToken("/api/v1/debate/room/livekit-token", payload)).rejects.toThrow("502");
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: { token: "token" } }) });
  await expect(requestLivekitToken("/api/v1/debate/room/livekit-token", payload)).rejects.toThrow("incomplete");
});
