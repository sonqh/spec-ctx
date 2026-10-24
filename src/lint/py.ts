// REQ-LINT-001 Python `re`, `str`, and `json` behavior that the two linters depend on.
// Python patterns are Unicode aware. JavaScript `\w`, `\b`, `\s`, and `\d` are not, so the ports use these classes.
import { cpLen, pyStrip } from "../util/pystr.ts";

export { cpLen, pyStrip };

/** Python `\w`: a letter, a number, or the underscore. */
export const W = "[\\p{L}\\p{N}_]";
/** Python `[^\W_]`: a letter or a number. */
export const WN = "[\\p{L}\\p{N}]";
/** Python `\b`. */
export const B = `(?:(?<=${W})(?!${W})|(?<!${W})(?=${W}))`;
const SP = "\\t-\\r\\x1c-\\x20\\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
/** Python `\s`, the set of `str.isspace()`. */
export const S = `[${SP}]`;
/** Python `\S`. */
export const NS = `[^${SP}]`;
/** Python `\d`. */
export const D = "\\p{Nd}";

/** A Unicode pattern. `flags` holds the Python flags as JavaScript letters: i, m, g. */
export function re(src: string, flags = ""): RegExp {
  return new RegExp(src, "u" + flags);
}

/** Python `re.escape` for the word lists. Only the characters that JavaScript needs. */
export function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

/** Python `str.splitlines()`. */
export function splitlines(s: string): string[] {
  const out = s.split(/\r\n|[\n\r\x0b\x0c\x1c\x1d\x1e\x85\u2028\u2029]/);
  if (out.length && out[out.length - 1] === "") out.pop();
  return out;
}

const LEAD = new RegExp(`^${S}+`, "u");
const TRAIL = new RegExp(`${S}+$`, "u");
export const lstrip = (s: string): string => s.replace(LEAD, "");
export const rstrip = (s: string): string => s.replace(TRAIL, "");

/** Python `str.lstrip(chars)`. */
export function lstripChars(s: string, chars: string): string {
  let i = 0;
  while (i < s.length && chars.includes(s[i]!)) i++;
  return s.slice(i);
}

/** Python `str.split()` with no argument. */
export function pySplit(s: string): string[] {
  const t = pyStrip(s);
  return t === "" ? [] : t.split(new RegExp(`${S}+`, "u"));
}

/** Python `s[:n]` on code points. */
export function cpSlice(s: string, n: number): string {
  return Array.from(s).slice(0, n).join("");
}

/** The code point index of a UTF-16 index in s. */
export function cpAt(s: string, i: number): number {
  return cpLen(s.slice(0, i));
}

/** Python `str.isupper()` on one character. */
export function isUpper(ch: string): boolean {
  return /^\p{Uppercase}$/u.test(ch);
}

/** Python `int(s)` for the flag values, ASCII digits only. NaN on a bad value. */
export function pyInt(s: string): number {
  const t = pyStrip(s);
  return /^[+-]?\d+(?:_\d+)*$/.test(t) ? Number(t.replace(/_/g, "")) : NaN;
}

/** Python `round(x, 1)`: half to even on the exact binary value. The result as Python prints it. */
export function round1(x: number): string {
  const neg = x < 0;
  const [int, frac = ""] = Math.abs(x).toFixed(100).split(".");
  const d = Number(frac[0] ?? "0");
  const rest = frac.slice(1).replace(/0+$/, "");
  let tenths = BigInt(int!) * 10n + BigInt(d);
  if (rest > "5" || (rest === "5" && d % 2 === 1) || (rest.startsWith("5") && rest.length > 1)) tenths += 1n;
  const s = `${tenths / 10n}.${tenths % 10n}`;
  return neg && tenths !== 0n ? "-" + s : s;
}

/** A float for `pyJson`. Python prints it with a decimal point. */
export class PyFloat {
  readonly text: string;
  constructor(text: string) {
    this.text = text;
  }
}

function jsonStr(s: string, ascii: boolean): string {
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const ch = s[i]!;
    if (ch === '"') out += '\\"';
    else if (ch === "\\") out += "\\\\";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (ch === "\b") out += "\\b";
    else if (ch === "\f") out += "\\f";
    else if (c < 0x20 || (ascii && c > 0x7e)) out += "\\u" + c.toString(16).padStart(4, "0");
    else out += ch;
  }
  return out + '"';
}

/** Python `json.dumps(v, indent=2, ensure_ascii=ascii)`. */
export function pyJson(v: unknown, ascii: boolean, level = 0): string {
  const pad = "  ".repeat(level + 1);
  const end = "  ".repeat(level);
  if (v instanceof PyFloat) return v.text;
  if (typeof v === "string") return jsonStr(v, ascii);
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v === null || v === undefined) return "null";
  if (Array.isArray(v)) {
    if (!v.length) return "[]";
    return "[\n" + v.map((x) => pad + pyJson(x, ascii, level + 1)).join(",\n") + "\n" + end + "]";
  }
  const keys = Object.keys(v as object);
  if (!keys.length) return "{}";
  return "{\n" + keys.map((k) => `${pad}${jsonStr(k, ascii)}: ${pyJson((v as Record<string, unknown>)[k], ascii, level + 1)}`).join(",\n") + "\n" + end + "}";
}

/** The line number of a UTF-16 position: one more than the count of newlines before it. */
export function lineIndex(text: string): (pos: number) => number {
  const nl: number[] = [];
  for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1)) nl.push(i);
  return (pos) => {
    let lo = 0;
    let hi = nl.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (nl[mid]! < pos) lo = mid + 1;
      else hi = mid;
    }
    return lo + 1;
  };
}
