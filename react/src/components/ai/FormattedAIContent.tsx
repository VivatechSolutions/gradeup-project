import React, { Fragment } from "react";

type FormattedAIContentProps = {
  value: unknown;
  className?: string;
  compact?: boolean;
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

function tokenizeInline(text: string) {
  const tokens: Array<{ type: "text" | "strong" | "code"; value: string }> = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    const value = match[0];
    if (value.startsWith("`")) {
      tokens.push({ type: "code", value: value.slice(1, -1) });
    } else {
      tokens.push({ type: "strong", value: value.slice(2, -2) });
    }
    lastIndex = match.index + value.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }

  return tokens;
}

function renderInline(text: string) {
  const parts = text.split("\n");
  return parts.map((part, lineIndex) => (
    <Fragment key={`${part}-${lineIndex}`}>
      {tokenizeInline(part).map((token, tokenIndex) => {
        if (token.type === "strong") {
          return <strong key={tokenIndex}>{token.value}</strong>;
        }
        if (token.type === "code") {
          return (
            <code key={tokenIndex} style={inlineCodeStyle}>
              {token.value}
            </code>
          );
        }
        return <Fragment key={tokenIndex}>{token.value}</Fragment>;
      })}
      {lineIndex < parts.length - 1 ? <br /> : null}
    </Fragment>
  ));
}

function parseMarkdown(text: string): MarkdownBlock[] {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
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
      listItems[listItems.length - 1] = `${listItems[listItems.length - 1]}\n${trimmed}`;
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

  if (typeof value === "string") {
    return <FormattedAIContent value={value} compact={depth > 0} />;
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
        .filter(([, child]) => child !== null && child !== undefined && child !== "")
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

  const blocks = parseMarkdown(value);

  return (
    <div className={className} style={containerStyle}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const size = compact
            ? [1.04, 1, 0.96, 0.92, 0.88, 0.85][block.level - 1] || 0.85
            : [1.2, 1.12, 1.04, 0.98, 0.92, 0.88][block.level - 1] || 0.88;
          const HeadingTag = (`h${Math.min(block.level, 6)}` as keyof JSX.IntrinsicElements);
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
              {renderInline(block.text)}
            </HeadingTag>
          );
        }

        if (block.type === "paragraph") {
          return (
            <p key={index} style={paragraphStyle}>
              {renderInline(block.text)}
            </p>
          );
        }

        if (block.type === "unordered-list") {
          return (
            <ul key={index} style={listStyle}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} style={{ marginBottom: "0.35rem" }}>
                  {renderInline(item)}
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
                  {renderInline(item)}
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
