import React from "react";
import { render, screen, within } from "@testing-library/react";
import FormattedAIContent from "./FormattedAIContent";

jest.mock("react-katex", () => ({ InlineMath: ({ math }: { math: string }) => <span>{math}</span>, BlockMath: ({ math }: { math: string }) => <div>{math}</div> }));

test("renders table headers, alignment, inline formatting, math and escaped pipes", () => {
  render(<FormattedAIContent value={"Comparison\n\n| Item | Value |\n| :--- | ---: |\n| **Speed** | $v$ |\n| A\\|B | `x|y` |"} />);
  const table = screen.getByRole("table");
  expect(within(table).getAllByRole("columnheader")).toHaveLength(2);
  expect(within(table).getAllByRole("row")).toHaveLength(3);
  expect(within(table).getByText("Speed").closest("strong")).toBeTruthy();
  expect(within(table).getByText("v").closest("td")?.style.textAlign).toBe("right");
  expect(within(table).getByText("A|B")).toBeTruthy();
  expect(within(table).getByText("x|y").tagName).toBe("CODE");
});

test("keeps incomplete table text and fenced code intact", () => {
  const view = render(<FormattedAIContent value={"| Name | Value |\n| ---"} />);
  expect(screen.queryByRole("table")).toBeNull();
  view.rerender(<FormattedAIContent value={"```\n| Name | Value |\n| --- | --- |\n```"} />);
  expect(screen.queryByRole("table")).toBeNull();
  expect(view.container.querySelector("pre code")?.textContent).toContain("| Name | Value |");
});

test("preserves tables during speech highlighting", () => {
  render(<FormattedAIContent value={"| Name |\n| --- |\n| English |"} highlightEnabled currentWordIndex={1} />);
  expect(screen.getByRole("table")).toBeTruthy();
  expect(screen.getByText("English").style.fontWeight).toBe("600");
});
