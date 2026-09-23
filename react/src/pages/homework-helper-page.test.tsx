import { render, screen, waitFor } from "@testing-library/react";
import HomeworkHelper from "./homework-helper-page";

jest.mock("wouter", () => ({
  useLocation: () => ["/homework-helper"],
}));

jest.mock("../hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "u1", name: "Test User" } }),
}));

jest.mock("../hooks/use-theme", () => ({
  useTheme: () => ({ isDark: false }),
}));

jest.mock("../components/navigation", () => () => <div>Navigation</div>);

jest.mock("../lib/gradeupApi", () => ({
  getLibrarySubjects: jest.fn().mockResolvedValue([]),
  getHomeworkChatHistory: jest.fn().mockResolvedValue({ sessions: [] }),
  getHomeworkChatSession: jest.fn().mockResolvedValue(null),
  sendHomeworkChat: jest.fn(),
}));

test("renders the homework helper mode banner without crashing", async () => {
  render(<HomeworkHelper />);

  await waitFor(() => {
    expect(screen.getByText(/Tutor Mode/i)).toBeInTheDocument();
  });
});
