/**
 * Gemini sometimes returns valid JSON then appends prose, a second object, or markdown fences.
 * JSON.parse(fullText) then throws e.g. "Unexpected non-whitespace character after JSON".
 * This extracts the first top-level `{ ... }` with string-aware brace matching.
 */
function stripOptionalMarkdownFence(s: string): string {
  const t = s.trim();
  if (!t.startsWith("```")) return t;
  const firstNl = t.indexOf("\n");
  const body = firstNl >= 0 ? t.slice(firstNl + 1) : t.replace(/^```[a-zA-Z0-9]*\s*\n?/, "");
  const end = body.lastIndexOf("```");
  const core = end >= 0 ? body.slice(0, end) : body;
  return core.trim();
}

/**
 * Best-effort repair of the JSON the model *meant* to emit. Only used as a
 * fallback after strict JSON.parse has already failed, so it can never make a
 * valid response worse. Handles the failure modes LLMs actually produce:
 *   - unescaped `"` inside a string value (e.g. an excerpt quoting `"cat"`),
 *     which prematurely closes the string and desyncs the parser
 *     (surfaces as `Expected ':' after property name…`),
 *   - raw newlines/tabs inside strings (must be \n / \t in JSON),
 *   - trailing commas before `}` / `]`.
 */
function repairLlmJson(s: string): string {
  const isWs = (c: string | undefined) => c === " " || c === "\t" || c === "\n" || c === "\r";
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;

    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        out += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        // Decide whether this quote really closes the string: a legitimate
        // closing quote is followed (after whitespace) by a structural
        // character. Anything else means it's a stray inner quote → escape it.
        let j = i + 1;
        while (isWs(s[j])) j++;
        const next = s[j];
        if (next === undefined || next === ":" || next === "," || next === "}" || next === "]") {
          inString = false;
          out += ch;
        } else {
          out += '\\"';
        }
        continue;
      }
      // Raw control characters are illegal inside JSON strings — escape them.
      if (ch === "\n") { out += "\\n"; continue; }
      if (ch === "\r") { out += "\\r"; continue; }
      if (ch === "\t") { out += "\\t"; continue; }
      out += ch;
      continue;
    }

    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === ",") {
      // Drop trailing commas: `, }` / `, ]`.
      let j = i + 1;
      while (isWs(s[j])) j++;
      if (s[j] === "}" || s[j] === "]") continue;
    }
    out += ch;
  }

  return out;
}

/** JSON.parse with a repair fallback for the malformed JSON LLMs emit. */
function parseLenient(slice: string): Record<string, unknown> {
  try {
    return JSON.parse(slice) as Record<string, unknown>;
  } catch {
    return JSON.parse(repairLlmJson(slice)) as Record<string, unknown>;
  }
}

export function parseFirstJsonObject(text: string): Record<string, unknown> {
  const s = stripOptionalMarkdownFence(text);
  const start = s.indexOf("{");
  if (start < 0) {
    throw new Error("No JSON object found in model response");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i]!;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString) {
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const slice = s.slice(start, i + 1);
        return parseLenient(slice);
      }
    }
  }

  throw new Error("Unclosed JSON object in model response");
}

export function parseGeminiJsonObjectResponse(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return parseFirstJsonObject(trimmed);
  }
}
