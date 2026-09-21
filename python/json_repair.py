"""
Repairing the JSON that LLMs actually return.

Open-weights models in JSON mode do not reliably emit a parseable object. Three
shapes show up constantly against OpenRouter, each of which used to throw away a
whole response:

  - the opening brace is missing  ->  '"section_title": ...'
  - the brace AND its quote are   ->  'ok": true}'
  - the reply is fenced, or has a sentence either side of the object
  - the reply is truncated by the output-token cap, mid-array or mid-string
  - a string carries a RAW newline / tab (Gemini quoting a poem line by line)
    or a list ends with a trailing comma - "Invalid control character" and
    "Expecting property name" from the parser, on an otherwise complete reply

None are recoverable by orjson alone, so try the repairs in order and take the
first candidate that parses to an object.
"""

import re
from typing import Any, Dict, List, Optional

import orjson

_CODE_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL)


def strip_code_fences(text: str) -> str:
    """Return the contents of the first fenced block, or the text unchanged.

    Matching the block as a pair beats searching for "```" twice: a lone fence
    inside the prose used to slice the response from the middle and throw away
    the JSON it was meant to expose.
    """
    match = _CODE_FENCE_RE.search(text)
    return (match.group(1) if match else text).strip()


def slice_outermost_object(text: str) -> Optional[str]:
    """The span from the first '{' to the last '}' — drops prose either side."""
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end <= start:
        return None
    return text[start:end + 1]


def balance_brackets(text: str) -> Optional[str]:
    """Close the brackets a model left open, ignoring any inside strings.

    Covers both halves of the problem: a reply that opens straight into
    '"key": ...' because JSON mode swallowed the '{', and one truncated by a
    token limit mid-structure. Closers come off a stack, so a cut-off array
    inside an object is closed as ']}' and not '}}'.
    """
    stripped = text.strip()
    if not stripped:
        return None
    if not stripped.startswith("{"):
        stripped = "{" + stripped

    closers = {"{": "}", "[": "]"}
    stack: List[str] = []
    in_string = False
    escaped = False
    for ch in stripped:
        if escaped:
            escaped = False
        elif ch == "\\":
            escaped = True
        elif ch == '"':
            in_string = not in_string
        elif not in_string:
            if ch in closers:
                stack.append(closers[ch])
            elif ch in ("}", "]") and stack and stack[-1] == ch:
                stack.pop()

    if in_string:
        stripped += '"'
    # A truncated reply usually stops after a comma or a dangling key.
    stripped = stripped.rstrip().rstrip(",")
    return stripped + "".join(reversed(stack))


_CONTROL_ESCAPES = {"\n": "\\n", "\r": "\\r", "\t": "\\t"}
_JSON_WHITESPACE = (" ", "\n", "\r", "\t")


def sanitize_json_text(text: str) -> str:
    """Escape raw control characters inside strings and drop trailing commas.

    Walks the text with the same in-string tracking as balance_brackets, so a
    newline that is part of a quoted poem line becomes the two characters
    backslash-n while the newlines between keys are left alone, and a ``,``
    right before ``}`` or ``]`` outside any string is removed. Both are
    rejected by orjson outright, and both show up on replies that are
    otherwise complete and correct.
    """
    out: List[str] = []
    in_string = False
    escaped = False
    for ch in text:
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            elif ch in _CONTROL_ESCAPES:
                out.append(_CONTROL_ESCAPES[ch])
                continue
            elif ord(ch) < 0x20:
                continue                       # other control chars: drop
            out.append(ch)
        else:
            if ch == '"':
                in_string = True
            elif ch in ("}", "]"):
                # Remove a trailing comma (and whitespace) before a closer.
                i = len(out) - 1
                while i >= 0 and out[i] in _JSON_WHITESPACE:
                    i -= 1
                if i >= 0 and out[i] == ",":
                    del out[i]
            out.append(ch)
    return "".join(out)


def json_candidates(raw: str) -> List[str]:
    """Ordered repair attempts for one LLM reply, best guess first."""
    if not raw:
        return []
    text = strip_code_fences(raw)

    if text.lstrip().startswith("{"):
        # Already opens as an object: most likely complete with prose around
        # it, or truncated. Slicing is the safer first move.
        ordered = [text, slice_outermost_object(text), balance_brackets(text)]
    else:
        ordered = [text, balance_brackets(text)]
        # JSON mode sometimes swallows the opening quote along with the brace,
        # leaving 'ok": true}' — restoring only "{" yields '{ok": true}', which
        # is still not parseable.
        if not text.lstrip().startswith('"'):
            ordered.append(balance_brackets('"' + text.lstrip()))
        # Slicing last here: on a body whose outer brace is missing it returns a
        # NESTED object, silently discarding every top-level key.
        ordered.append(slice_outermost_object(text))

    # Every structural repair again with control characters escaped and
    # trailing commas gone - after the originals, so a reply that already
    # parses is never altered.
    ordered += [sanitize_json_text(c) for c in ordered if c]

    seen = set()
    out = []
    for candidate in ordered:
        if candidate and candidate not in seen:
            seen.add(candidate)
            out.append(candidate)
    return out


def parse_llm_json(raw: str) -> Optional[Dict[str, Any]]:
    """Parse an LLM reply into a dict, repairing it first. None if nothing works."""
    for candidate in json_candidates(raw):
        try:
            parsed = orjson.loads(candidate)
        except orjson.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            return parsed
    return None
