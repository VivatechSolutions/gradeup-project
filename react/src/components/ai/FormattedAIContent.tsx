import React, { Fragment, useEffect } from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

type FormattedAIContentProps = {
  value: unknown;
  className?: string;
  compact?: boolean;
  highlightEnabled?: boolean;
  currentWordIndex?: number;
};

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "code"; text: string };

const containerStyle: React.CSSProperties = {
  fontSize: "inherit",
  lineHeight: 1.7,
  color: "inherit",
  wordBreak: "normal",
  overflowWrap: "anywhere",
};

const paragraphStyle: React.CSSProperties = {
  margin: "0 0 0.7rem",
};

const listStyle: React.CSSProperties = {
  margin: "0 0 0.8rem 1.1rem",
  padding: 0,
};

const codeBlockStyle: React.CSSProperties = {
  margin: "0 0 0.8rem",
  padding: "0.8rem 0.9rem",
  borderRadius: 12,
  background: "rgba(15,23,42,0.08)",
  overflowX: "auto",
  whiteSpace: "pre-wrap",
  fontSize: "0.92em",
};

const inlineCodeStyle: React.CSSProperties = {
  padding: "0.08rem 0.35rem",
  borderRadius: 6,
  background: "rgba(15,23,42,0.08)",
  fontSize: "0.92em",
};

const highlightStyle: React.CSSProperties = {
  background: "linear-gradient(135deg,#fef3c7,#fde68a)",
  borderRadius: 3,
  padding: "0 2px",
  color: "#1a1a1a",
  fontWeight: 600,
};

/**
 * Clean up LaTeX content for KaTeX rendering
 * Handles newlines, spacing, and array environments
 */
function cleanLaTeXContent(latex: string): string {
  let cleaned = latex.trim();

  // Decode HTML entities
  cleaned = cleaned
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

  // Handle malformed array/matrix/aligned content from API
  if (
    /\\begin\{(array|aligned|align\*?|matrix|pmatrix|bmatrix|cases)\}/.test(
      cleaned,
    )
  ) {
    // Convert literal \n from API into LaTeX row breaks
    cleaned = cleaned.replace(/\\n/g, " \\\\ ");

    // Convert accidental single slash row endings (but don't touch rows
    // that already have a proper double-backslash "\\" line break)
    cleaned = cleaned.replace(/,\s*\\(?!\\)\s*/g, ", \\\\ ");

    // Remove excessive whitespace
    cleaned = cleaned.replace(/\s+/g, " ");

    return cleaned;
  }

  return cleaned.replace(/\s+/g, " ");
}

function normalizeLabel(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (match) => match.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function tokenizeInline(
  text: string,
  highlightEnabled = false,
  currentWordIndex = -1,
  wordCounterRef?: { current: number },
) {
  const tokens: Array<{
    type: "text" | "strong" | "code";
    value: string;
  }> = [];

  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: "text",
        value: text.slice(lastIndex, match.index),
      });
    }

    const value = match[0];

    if (value.startsWith("`")) {
      tokens.push({
        type: "code",
        value: value.slice(1, -1),
      });
    } else {
      tokens.push({
        type: "strong",
        value: value.slice(2, -2),
      });
    }

    lastIndex = match.index + value.length;
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: "text",
      value: text.slice(lastIndex),
    });
  }

  return tokens;
}

function renderWordHighlightedText(
  text: string,
  highlightEnabled: boolean,
  currentWordIndex: number,
  wordCounterRef: { current: number },
) {
  const parts = text.split(/(\s+)/);

  return parts.map((part, index) => {
    if (!part.trim()) {
      return <Fragment key={index}>{part}</Fragment>;
    }

    const currentIndex = wordCounterRef.current++;

    return (
      <span
        key={index}
        style={
          highlightEnabled && currentIndex === currentWordIndex
            ? highlightStyle
            : undefined
        }
      >
        {part}
      </span>
    );
  });
}

function renderMathAwareText(
  text: string,
  highlightEnabled: boolean,
  currentWordIndex: number,
  wordCounterRef: { current: number },
) {
  const segments = [];

  // Match block math delimiters ($$...$$ or \[...\])
  const regex =
    /(\$\$[\s\S]*?\$\$|\$[^$]+\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }

    segments.push({
      type: "math",
      content: match[0],
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  return segments.map((segment, index) => {
    if (segment.type === "math") {
      let expression = segment.content;
      let isBlock = false;

      // Detect and handle block math delimiters
      if (expression.startsWith("\\[") && expression.endsWith("\\]")) {
        expression = expression.slice(2, -2);
        isBlock = true;
      } else if (expression.startsWith("$$") && expression.endsWith("$$")) {
        expression = expression.slice(2, -2);
        isBlock = true;
      } else if (expression.startsWith("\\(") && expression.endsWith("\\)")) {
        expression = expression.slice(2, -2);
        isBlock = false;
      } else if (expression.startsWith("$") && expression.endsWith("$")) {
        expression = expression.slice(1, -1);
        isBlock = false;
      }

      // Clean the LaTeX content
      expression = cleanLaTeXContent(expression);
      // API sometimes sends malformed array rows
      expression = expression.replace(
        /\\begin\{array\}\{l\}(.*?)\\end\{array\}/s,
        (_, content) => {
          return `\\begin{array}{l}${content
            .replace(/\\n/g, " \\\\ ")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/\s+/g, " ")}\\end{array}`;
        },
      );
      // Render based on whether it's block or inline
      if (isBlock) {
        return <BlockMath key={index} math={expression} />;
      } else {
        return <InlineMath key={index} math={expression} />;
      }
    }

    return (
      <Fragment key={index}>
        {renderWordHighlightedText(
          segment.content,
          highlightEnabled,
          currentWordIndex,
          wordCounterRef,
        )}
      </Fragment>
    );
  });
}

function renderInline(
  text: string,
  highlightEnabled = false,
  currentWordIndex = -1,
  wordCounterRef?: { current: number },
) {
  const blockMaths: string[] = [];

  // Extract block math first to prevent interference with paragraph parsing.
  // This must catch \[...\], $$...$$, AND bare \begin{array}/aligned/matrix/
  // etc. environments that arrive with no $ delimiters at all. Without this,
  // a $$ that opens on one line and closes several lines later never finds
  // its matching pair once the text below is split into individual lines,
  // so the literal "$$" markers (and unrendered LaTeX source) leak into the
  // output instead of being rendered as math.
  const blockMathPattern =
    /\\\[\s*([\s\S]*?)\s*\\\]|\$\$\s*([\s\S]*?)\s*\$\$|(\\begin\{(?:array|aligned|align\*?|matrix|pmatrix|bmatrix|cases)\}[\s\S]*?\\end\{(?:array|aligned|align\*?|matrix|pmatrix|bmatrix|cases)\})/g;

  const normalizedText = text.replace(
    blockMathPattern,
    (_match, bracketFormula, dollarFormula, bareEnvFormula) => {
      const formula = bracketFormula ?? dollarFormula ?? bareEnvFormula;
      const index = blockMaths.length;
      blockMaths.push(formula);
      return `@@BLOCK_MATH_${index}@@`;
    },
  );

  const parts = normalizedText.split("\n");

  return parts.map((part, lineIndex) => {
    const blockMatch = part.match(/^@@BLOCK_MATH_(\d+)@@$/);

    if (blockMatch) {
      const formula = blockMaths[Number(blockMatch[1])];
      const cleaned = cleanLaTeXContent(formula);
      return <BlockMath key={`math-${lineIndex}`} math={cleaned} />;
    }

    return (
      <Fragment key={`${part}-${lineIndex}`}>
        {tokenizeInline(part).map((token, tokenIndex) => {
          if (token.type === "strong") {
            return (
              <strong key={tokenIndex}>
                {renderMathAwareText(
                  token.value,
                  highlightEnabled,
                  currentWordIndex,
                  wordCounterRef!,
                )}
              </strong>
            );
          }

          if (token.type === "code") {
            return (
              <code key={tokenIndex} style={inlineCodeStyle}>
                {token.value}
              </code>
            );
          }

          return (
            <Fragment key={tokenIndex}>
              {renderMathAwareText(
                token.value,
                highlightEnabled,
                currentWordIndex,
                wordCounterRef!,
              )}
            </Fragment>
          );
        })}

        {lineIndex < parts.length - 1 ? <br /> : null}
      </Fragment>
    );
  });
}

function parseMarkdown(text: string): MarkdownBlock[] {
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let listType: "unordered-list" | "ordered-list" | null = null;
  let listItems: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", text: paragraph.join("\n").trim() });
    paragraph = [];
  };

  const flushList = () => {
    if (!listType || !listItems.length) return;
    blocks.push({ type: listType, items: [...listItems] });
    listType = null;
    listItems = [];
  };

  const flushCode = () => {
    if (!codeLines.length) return;
    blocks.push({ type: "code", text: codeLines.join("\n") });
    codeLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      flushParagraph();
      flushList();
      if (inCode) {
        flushCode();
      }
      inCode = !inCode;
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (listType && listType !== "unordered-list") {
        flushList();
      }
      listType = "unordered-list";
      listItems.push(unorderedMatch[1].trim());
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType && listType !== "ordered-list") {
        flushList();
      }
      listType = "ordered-list";
      listItems.push(orderedMatch[1].trim());
      continue;
    }

    if (listType) {
      listItems[listItems.length - 1] =
        `${listItems[listItems.length - 1]}\n${trimmed}`;
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  if (inCode) {
    flushCode();
  }

  return blocks;
}

function renderStructuredValue(value: unknown, depth = 0): React.ReactNode {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // Prevent infinite recursion on deeply nested objects
  if (depth > 5) {
    return <span>{String(value)}</span>;
  }

  if (typeof value === "string") {
    // Only parse as markdown at top level, not in nested structures
    if (depth === 0) {
      return <FormattedAIContent value={value} compact={depth > 0} />;
    }
    return <span>{value}</span>;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <span>{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    return (
      <ul style={listStyle}>
        {value
          .filter((item) => item !== null && item !== undefined && item !== "")
          .map((item, index) => (
            <li key={index} style={{ marginBottom: "0.35rem" }}>
              {renderStructuredValue(item, depth + 1)}
            </li>
          ))}
      </ul>
    );
  }

  if (!isPlainObject(value)) {
    return <span>{String(value)}</span>;
  }

  return (
    <div style={{ display: "grid", gap: depth === 0 ? "0.8rem" : "0.55rem" }}>
      {Object.entries(value)
        .filter(
          ([, child]) => child !== null && child !== undefined && child !== "",
        )
        .map(([key, child]) => (
          <div
            key={key}
            style={{
              padding: depth === 0 ? "0.75rem 0.85rem" : 0,
              borderRadius: depth === 0 ? 14 : 0,
              background: depth === 0 ? "rgba(99,102,241,0.06)" : "transparent",
              border: depth === 0 ? "1px solid rgba(99,102,241,0.12)" : "none",
            }}
          >
            <div
              style={{
                fontSize: depth === 0 ? "0.72rem" : "0.78rem",
                fontWeight: 800,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: "rgba(100,116,139,0.95)",
                marginBottom: "0.45rem",
              }}
            >
              {normalizeLabel(key)}
            </div>
            <div>{renderStructuredValue(child, depth + 1)}</div>
          </div>
        ))}
    </div>
  );
}

export default function FormattedAIContent({
  value,
  className,
  compact = false,
  highlightEnabled = false,
  currentWordIndex = -1,
}: FormattedAIContentProps) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return (
      <div className={className} style={containerStyle}>
        {renderStructuredValue(value)}
      </div>
    );
  }

  const wordCounterRef = { current: 0 };
  const blocks = parseMarkdown(value);

  return (
    <div className={className} style={containerStyle}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const size = compact
            ? [1.04, 1, 0.96, 0.92, 0.88, 0.85][block.level - 1] || 0.85
            : [1.2, 1.12, 1.04, 0.98, 0.92, 0.88][block.level - 1] || 0.88;
          const HeadingTag =
            `h${Math.min(block.level, 6)}` as keyof JSX.IntrinsicElements;
          return (
            <HeadingTag
              key={index}
              style={{
                margin: "0 0 0.55rem",
                fontSize: `${size}em`,
                lineHeight: 1.35,
                fontWeight: 800,
              }}
            >
              {renderInline(
                block.text,
                highlightEnabled,
                currentWordIndex,
                wordCounterRef,
              )}
            </HeadingTag>
          );
        }

        if (block.type === "paragraph") {
          return (
            <p key={index} style={paragraphStyle}>
              {renderInline(
                block.text,
                highlightEnabled,
                currentWordIndex,
                wordCounterRef,
              )}
            </p>
          );
        }

        if (block.type === "unordered-list") {
          return (
            <ul key={index} style={listStyle}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} style={{ marginBottom: "0.35rem" }}>
                  {renderInline(
                    item,
                    highlightEnabled,
                    currentWordIndex,
                    wordCounterRef,
                  )}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "ordered-list") {
          return (
            <ol key={index} style={listStyle}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} style={{ marginBottom: "0.35rem" }}>
                  {renderInline(
                    item,
                    highlightEnabled,
                    currentWordIndex,
                    wordCounterRef,
                  )}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <pre key={index} style={codeBlockStyle}>
            <code>{block.text}</code>
          </pre>
        );
      })}
    </div>
  );
}