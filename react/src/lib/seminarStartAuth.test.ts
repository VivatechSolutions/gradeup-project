import { startSeminar, joinSeminarSession } from "./gradeupApi";

jest.mock("./apiBase", () => ({ buildApiUrl: (path: string) => `https://api.example${path}` }));
const originalFetch = global.fetch;
const fetchMock = jest.fn();
beforeEach(() => { global.fetch = fetchMock; fetchMock.mockReset(); });
afterAll(() => { global.fetch = originalFetch; });

test("seminar file upload sends the file and login cookies to the auth API", async () => {
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: true, data: { sessionId: "room" } }) });
  const file = new File(["presentation"], "lesson.pdf", { type: "application/pdf" });
  await startSeminar({ file, sessionId: "room", candidateId: "student", candidateName: "Student", unitId: "unit", topic: "Lesson", mode: "main" });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("https://api.example/api/v1/seminar/start");
  expect(init.credentials).toBe("include");
  expect(init.body).toBeInstanceOf(FormData);
  expect(init.body.get("file")).toBe(file);
  expect(init.body.get("mode")).toBe("main");
  expect(init.headers["Content-Type"]).toBeUndefined();
});

test("failed upload rejects with the backend message", async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({ status: false, message: "Authentication required" }) });
  const file = new File(["presentation"], "lesson.pdf", { type: "application/pdf" });
  await expect(startSeminar({ file, sessionId: "room", candidateId: "student", candidateName: "Student", unitId: "unit", topic: "Lesson", mode: "main" })).rejects.toThrow("Authentication required");
});

test("observer heartbeat uses the authenticated seminar API", async () => {
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: true, data: {} }) });
  await joinSeminarSession({ sessionId: "room", candidateId: "student", candidateName: "Student", role: "observer" });
  expect(fetchMock).toHaveBeenCalledWith("https://api.example/api/v1/seminar/join", expect.objectContaining({ credentials: "include", method: "POST" }));
});
