// REQ-IDX-002 string helpers that give the same result as the Python oracle.

/** Characters that Python `str.isspace()` accepts. JavaScript `\s` and `trim()` use a different set. */
const PY_WS = "\\t\\n\\v\\f\\r\\x1c-\\x1f \\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const WS_RUN = new RegExp(`[${PY_WS}]+`, "g");
const LEAD = new RegExp(`^[${PY_WS}]+`);
const TRAIL = new RegExp(`[${PY_WS}]+$`);

/** Python `str.strip()`. */
export function pyStrip(s: string): string {
  return s.replace(LEAD, "").replace(TRAIL, "");
}

/** Python `str.split()` with no argument. */
export function pySplit(s: string): string[] {
  const t = pyStrip(s);
  return t === "" ? [] : t.split(WS_RUN);
}

/** Lines split on LF only, with a trailing CR removed. */
export function splitLines(text: string): string[] {
  const lines = text.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines.map((l) => (l.endsWith("\r") ? l.slice(0, -1) : l));
}

/** Join, collapse whitespace, lower-case. */
export function squash(lines: string[]): string {
  return pySplit(lines.join(" ")).join(" ").toLowerCase();
}

/** Length in code points, as Python `len()` counts it. */
export function cpLen(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      const d = s.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) i++;
    }
    n++;
  }
  return n;
}

/** Compare strings by code point, as Python sorts them. */
export function cmpStr(a: string, b: string): number {
  if (a === b) return 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a.codePointAt(i)!;
    const y = b.codePointAt(i)!;
    if (x !== y) return x < y ? -1 : 1;
    if (x > 0xffff) i++;
  }
  return a.length < b.length ? -1 : a.length > b.length ? 1 : 0;
}

/** Compare tuples of strings and numbers element by element. */
export function cmpTuple(a: readonly (string | number)[], b: readonly (string | number)[]): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i]!;
    const y = b[i]!;
    const c = typeof x === "number" && typeof y === "number" ? x - y : cmpStr(String(x), String(y));
    if (c !== 0) return c < 0 ? -1 : 1;
  }
  return a.length - b.length;
}
