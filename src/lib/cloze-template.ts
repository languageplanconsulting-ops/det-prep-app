/**
 * Shared `[[N]]`-placeholder template parser for the write/speak lesson
 * runners — ported from det-mobile/src/lib/readspeak.ts `splitTemplate`.
 */
export type TemplatePart = { text: string } | { blank: number };

export function splitTemplate(template: string): TemplatePart[] {
  const out: TemplatePart[] = [];
  const re = /\[\[(\d+)\]\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template))) {
    if (m.index > last) out.push({ text: template.slice(last, m.index) });
    out.push({ blank: parseInt(m[1]!, 10) });
    last = m.index + m[0].length;
  }
  if (last < template.length) out.push({ text: template.slice(last) });
  return out;
}
