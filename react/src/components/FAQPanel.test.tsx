import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import FAQPanel from "./FAQPanel";
import { getFaqs } from "../lib/gradeupApi";
jest.mock("../lib/gradeupApi", () => ({ getFaqs: jest.fn() }));
beforeEach(() => jest.clearAllMocks());

test("displays only genuine FAQ question/answer pairs", async () => {
  (getFaqs as jest.Mock).mockResolvedValue({ faqs: [
    { question: "What is a noun?", answer: "A naming word." },
    { title: "Section title", content: "Section prose" },
    { question: "Missing answer" },
  ] });
  render(<FAQPanel unit="Poetry" unitId="unit-1" onBack={() => {}} />);
  fireEvent.click(await screen.findByText("What is a noun?"));
  expect(screen.getByText("A naming word.")).toBeTruthy();
  expect(screen.queryByText("Section title")).toBeNull();
  expect(screen.queryByText("Missing answer")).toBeNull();
});

test("clears old FAQs and ignores late results after selecting a different unit", async () => {
  let resolveFirst!: (value: any) => void;
  (getFaqs as jest.Mock).mockImplementation((id: string) => id === "unit-1" ? new Promise((resolve) => { resolveFirst = resolve; }) : Promise.resolve({ faqs: [] }));
  const view = render(<FAQPanel unit="First" unitId="unit-1" onBack={() => {}} />);
  view.rerender(<FAQPanel unit="Second" unitId="unit-2" onBack={() => {}} />);
  await screen.findByText("No FAQs found for the selected unit.");
  await act(async () => resolveFirst({ faqs: [{ question: "Old question", answer: "Old answer" }] }));
  expect(screen.queryByText("Old question")).toBeNull();
});
