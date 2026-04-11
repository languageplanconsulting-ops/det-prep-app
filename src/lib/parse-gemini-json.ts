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
        return JSON.parse(slice) as Record<string, unknown>;
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
