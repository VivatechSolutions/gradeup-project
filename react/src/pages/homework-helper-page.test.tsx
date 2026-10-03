import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import HomeworkHelper from "./homework-helper-page";
import { getLibrarySubjects, getHomeworkChatHistory, getHomeworkChatSession, sendHomeworkChat } from "../lib/gradeupApi";

let mockSearch = "subjectGroupKey=english&unitId=english-1&from=%2Fai-tutor&newChat=first";
jest.mock("wouter", () => ({ useSearch: () => mockSearch }));
jest.mock("../hooks/use-auth", () => ({ useAuth: () => ({ user: { role: "student" } }) }));
jest.mock("../hooks/use-theme", () => ({ useTheme: () => ({ isDark: false }) }));
jest.mock("../components/navigation", () => () => null);
jest.mock("../components/ai/FormattedAIContent", () => ({ value }: { value: string }) => <div>{value}</div>);
jest.mock("../lib/gradeupApi", () => ({
  getLibrarySubjects: jest.fn(), getHomeworkChatHistory: jest.fn(), getHomeworkChatSession: jest.fn(), sendHomeworkChat: jest.fn(),
  getLibraryUnitDisplayLabel: (unit: any) => unit.unitTitle,
}));
const catalog = [
  { subjectGroupKey: "english", title: "English", subject: "English", board: "State", standard: "10", units: [{ id: "english-1", subject: "English", unitTitle: "Poetry", unitNumber: 1, term: "Term 1" }] },
  { subjectGroupKey: "science", title: "Science", subject: "Science", board: "State", standard: "10", units: [{ id: "science-2", subject: "Science", unitTitle: "Light", unitNumber: 2 }] },
];
const oldChat = { id: "old", homeworkId: "old", title: "Previous homework", subject: "Science", subjectGroupKey: "science", unitId: "science-2", mode: "guided", messages: [{ id: "answer", role: "assistant", content: "Previous chat answer", createdAt: new Date().toISOString() }], updatedAt: new Date().toISOString() };
function stored() { return JSON.parse(localStorage.getItem("gradeup-homework-helper-v4") || "{}"); }
beforeEach(() => {
  jest.clearAllMocks();
  mockSearch = "subjectGroupKey=english&unitId=english-1&from=%2Fai-tutor&newChat=first";
  localStorage.setItem("gradeup-homework-helper-v4", JSON.stringify({ sessions: [oldChat], activeId: "old" }));
  (getLibrarySubjects as jest.Mock).mockResolvedValue(catalog);
  (getHomeworkChatHistory as jest.Mock).mockResolvedValue({ sessions: [] });
  (getHomeworkChatSession as jest.Mock).mockResolvedValue({ session: { homework_id: "server-old", subject: "Science", subject_group_key: "science", unit_id: "science-2", chat_history: [] } });
  (sendHomeworkChat as jest.Mock).mockResolvedValue({ homework_id: "new-server-chat", response: "New homework answer" });
});

test("renders the homework helper without crashing", async () => {
  mockSearch = "";
  render(<HomeworkHelper />);
  await waitFor(() => expect(screen.getByText("Homework Helper AI")).toBeTruthy());
});

test("starts a fresh tutor-context chat and late server history cannot replace it", async () => {
  let resolveHistory!: (value: any) => void;
  (getHomeworkChatHistory as jest.Mock).mockReturnValue(new Promise((resolve) => { resolveHistory = resolve; }));
  render(<React.StrictMode><HomeworkHelper /></React.StrictMode>);
  await waitFor(() => expect(stored().activeId).not.toBe("old"));
  const state = stored();
  const active = state.sessions.find((session: any) => session.id === state.activeId);
  expect(active).toMatchObject({ subjectGroupKey: "english", unitId: "english-1", subject: "English", messages: [], term: "Term 1" });
  expect(active.homeworkId).toBeUndefined();
  expect(state.sessions.filter((session: any) => session.title === "New chat")).toHaveLength(1);
  expect(screen.queryByText("Previous chat answer")).toBeNull();
  await act(async () => resolveHistory({ sessions: [{ homework_id: "server-old", title: "Server history", subject: "Science" }] }));
  await waitFor(() => expect(stored().sessions.some((session: any) => session.id === "server-old")).toBe(true));
  expect(stored().activeId).toBe(active.id);
  expect(Array.from(document.querySelectorAll("select")).some((select) => select.value === "english")).toBe(true);
  expect(Array.from(document.querySelectorAll("select")).some((select) => select.value === "english-1")).toBe(true);
});

test("handles a second navigation on the mounted page and rejects mismatched subject/unit IDs", async () => {
  const view = render(<HomeworkHelper />);
  await waitFor(() => expect(stored().activeId).not.toBe("old"));
  const firstId = stored().activeId;
  mockSearch = "subjectGroupKey=science&unitId=science-2&from=%2Fai-tutor&newChat=second";
  view.rerender(<HomeworkHelper />);
  await waitFor(() => expect(stored().activeId).not.toBe(firstId));
  let state = stored();
  expect(state.sessions.find((session: any) => session.id === state.activeId)).toMatchObject({ subjectGroupKey: "science", unitId: "science-2", messages: [] });
  mockSearch = "subjectGroupKey=english&unitId=science-2&from=%2Fai-tutor&newChat=invalid";
  view.rerender(<HomeworkHelper />);
  expect(await screen.findByRole("alert")).toBeTruthy();
  state = stored();
  expect(state.sessions.find((session: any) => session.id === state.activeId)).toMatchObject({ subjectGroupKey: null, unitId: null, messages: [] });
});

test("waits for subjects when history arrives first and sends the fresh chat with matching context", async () => {
  let resolveSubjects!: (value: any) => void;
  (getLibrarySubjects as jest.Mock).mockReturnValue(new Promise((resolve) => { resolveSubjects = resolve; }));
  (getHomeworkChatHistory as jest.Mock).mockResolvedValue({ sessions: [{ homework_id: "server-old", title: "Server history", subject: "Science" }] });
  render(<HomeworkHelper />);
  expect(screen.getByRole("status").textContent).toContain("Preparing your homework chat");
  await waitFor(() => expect(stored().sessions.some((session: any) => session.id === "server-old")).toBe(true));
  await act(async () => resolveSubjects(catalog));
  await waitFor(() => expect(stored().activeId).not.toBe("old"));
  const state = stored();
  expect(state.sessions.find((session: any) => session.id === state.activeId)).toMatchObject({ subjectGroupKey: "english", unitId: "english-1", messages: [] });
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Explain this poem" } });
  fireEvent.click(screen.getByTitle("Send homework question"));
  await waitFor(() => expect(sendHomeworkChat).toHaveBeenCalledWith(expect.objectContaining({ homeworkId: "new", subjectGroupKey: "english", unitId: "english-1", subject: "English", unitNumber: 1, term: "Term 1" })));
  await screen.findByText("New homework answer");
});
