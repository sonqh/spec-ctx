// REQ-LINT-001 REQ-LINT-002 ste-lint: the structural STE rules. A port of scripts/ste-lint.py, rule by rule.
// Columns count code points, as Python does. Masks keep the code point count of the text they replace.
import { B, cpAt, isUpper, lstrip, lstripChars, NS, pySplit, pyStrip, re, rstrip, S, splitlines, W, WN } from "./py.ts";

export interface SteRule {
  id: string;
  level: "advisory-free" | "advisory";
  /** null for a rule that code checks, not a pattern. */
  pattern: RegExp | null;
  message: string;
}

export interface SteFinding {
  file: string;
  line: number;
  col: number;
  rule: string;
  level: string;
  match: string;
  message: string;
}

const IRREGULAR_PARTICIPLES = "given|taken|made|done|found|seen|known|shown|written|built|sent|set|run|read|kept|held|left|put|cut|hit|let|shut|split|spread|begun|become|come|gone|got|gotten|lost|met|paid|said|sold|told|thought|brought|bought|caught|taught|won|worn|torn|born|drawn|grown|thrown|flown|driven|risen|chosen|broken|spoken|frozen|hidden|ridden|forgotten|fallen|eaten|beaten|understood|stood|struck|stuck|swung|hung|led|fed|bled|fled|sped|bound|wound|dug|spun|slid|bit|lit|quit";
const PASSIVE_PARTICIPLES = "given|taken|made|done|found|seen|known|shown|written|built|sent|set|run|read|kept|held|left|put";
const MODAL_PERFECT_PREFIX = re(`${B}(?:may|might|could|should|would|must|can|will|shall)(?:${S}+not|n['’]t)?${S}+$`, "i");

export const MAX_WORDS = 25;

export const STE_RULES: SteRule[] = [
  { id: "semicolon", level: "advisory-free", pattern: re(";", "g"), message: "STE bans the semicolon (Rule 8.1). Split into separate sentences." },
  {
    id: "phrasal-verb",
    level: "advisory-free",
    pattern: re(`${B}(spin(?:ning|s)? up|spun up|reach(?:ing|es|ed)? out|div(?:e|es|ing|ed) into|dove into|kick(?:ing|s|ed)? off|circl(?:e|es|ing|ed) back|touch(?:ing|es|ed)? base)${B}`, "gi"),
    message: "Soft phrasal verb. Use the single plain verb (start, contact, read, begin).",
  },
  {
    id: "marketing-adjective",
    level: "advisory-free",
    pattern: re(`${B}(seamless(?:ly)?|robust(?:ly)?|cutting-edge|effortless(?:ly)?|blazing[- ]fast|world-class|state-of-the-art|game-chang(?:ing|er))${B}`, "gi"),
    message: "Marketing adjective. Delete, or replace with the measurement that earns the claim.",
  },
  {
    id: "nominalization",
    level: "advisory-free",
    pattern: re(`${B}(perform|performs|performed|conduct|conducts|conducted|carry out|carries out|carried out)${S}+(?:a|an|the)${S}+${W}+(?:tion|sion|ment|ance|ence|ysis)${B}`, "gi"),
    message: "Action frozen into a noun. Use the verb (analyze, not perform an analysis of).",
  },
  {
    id: "passive-voice",
    level: "advisory",
    pattern: re(`${B}(is|are|was|were|been|being)${S}+(${W}+ed|${PASSIVE_PARTICIPLES})${B}(?!${S}+(?:to|for|by)${S}+${W}+ing)`, "gi"),
    message: "Possible passive voice. Name the actor and use an active verb, unless the actor is unknown or irrelevant.",
  },
  {
    id: "present-perfect",
    level: "advisory",
    // modal + perfect infinitive ("may have failed") is a protected hedge, not present perfect
    pattern: re(
      ["may", "might", "could", "should", "would", "must"].map((m) => `(?<!${B}${m} )`).join("") +
        `${B}(has|have|had)${S}+(?:been${S}+)?(?:${W}+(?:ed|en)|${IRREGULAR_PARTICIPLES})${B}`,
      "gi",
    ),
    message: "Compound tense. Use simple past/present unless current relevance is the point (then keep and flag).",
  },
  { id: "long-sentence", level: "advisory-free", pattern: null, message: `Sentence has N words (cap ${MAX_WORDS}). Split it.` },
  { id: "synonym-rotation", level: "advisory-free", pattern: null, message: "Two members of one synonym group name the same action. Pick one and use it every time." },
  { id: "dangling-conjunction", level: "advisory-free", pattern: null, message: "List item ends with a coordinating conjunction. Complete the item or join it with the next item." },
];

export const STE_IDS = STE_RULES.map((r) => r.id);
const REGEX_RULES = STE_RULES.filter((r) => r.pattern !== null);

const SYNONYM_GROUPS = [
  ["check", "verify", "confirm", "validate"],
  ["delete", "remove", "erase"],
  ["start", "launch", "begin", "initiate"],
  ["stop", "halt", "terminate"],
  ["show", "display"],
  ["use", "utilize", "employ"],
  ["fix", "repair", "correct"],
  ["send", "transmit"],
  ["get", "retrieve", "fetch", "obtain"],
  ["change", "modify", "alter"],
];
const WORD_RES = SYNONYM_GROUPS.map((g) => g.map((base) => re(`${B}${base}(?:s|es|ed|d|ing)?${B}`, "i")));

const CODE_FENCE = re("^(```|~~~)");
const INLINE_CODE = re("`[^`]*`", "g");
const LIST_ITEM_START = re("^(?<indent> {0,3})(?<marker>[-*+]|[0-9]+[.)])(?<gap> +)(?<body>.*)$");
const CONJUNCTION_END = re(`${B}(?:and|or)${S}*$`, "i");
const TABLE_SEPARATOR_CELL = re("^:?-{3,}:?$");
const STANDALONE_LINE = re("^ {0,3}(?:#|<|(?:[-*_=] *){3,}$)");
const BLOCKQUOTE_PREFIX = re("^ {0,3}(?:> ?)+");
const GITHUB_ALERT = re("^\\[!(?:note|tip|important|warning|caution)\\]$", "i");
const HTML_TAGS =
  "address|article|aside|blockquote|body|caption|center|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|" +
  "header|hgroup|html|iframe|legend|li|main|menu|nav|noframes|ol|optgroup|option|p|pre|script|search|section|style|summary|table|" +
  "tbody|td|textarea|tfoot|th|thead|title|tr|ul";
const HTML_BLOCK_TAG_SRC = `<(/?)(${HTML_TAGS})(?=[${S.slice(1, -1)}/>])[^>]*>`;
const HTML_BLOCK_START = re("^" + HTML_BLOCK_TAG_SRC, "i");
const HTML_BLOCK_TAG = re(HTML_BLOCK_TAG_SRC, "gi");
const ANY_LIST_ITEM = re(`^${S}*(?:[-*+]|[0-9]+[.)])(?:${S}|$)`);
const WORD_CHAR = re(WN);
const SENTENCE_END = re("[.!?][\"'”’)\\]*_]*$");
const OPENERS = "\"'“‘([*_";
const ABBREVIATIONS = new Set(["vs.", "cf.", "approx.", "mr.", "mrs.", "ms.", "dr.", "fig.", "no."]);
const DOTTED_ABBREVIATION = re("^(?:[a-z]\\.){2,}$", "i");
const TOKEN = re(`${NS}+`, "g");

/** A count of the tokens that hold a letter or a digit. */
export function countWords(text: string): number {
  return pySplit(text).filter((t) => WORD_CHAR.test(t)).length;
}

/** Blank code spans with as many spaces as they have code points. */
export function maskInlineCode(text: string): string {
  return text.replace(INLINE_CODE, (m) => " ".repeat(Array.from(m).length));
}

/** The UTF-16 offset of each sentence start in text. */
export function sentenceStarts(text: string): number[] {
  const words = [...text.matchAll(TOKEN)];
  if (!words.length) return [0];
  const starts = [words[0]!.index];
  for (let i = 0; i + 1 < words.length; i++) {
    const w = words[i]![0];
    const next = words[i + 1]!;
    const end = SENTENCE_END.exec(w);
    if (!end) continue;
    const core = lstripChars(w.slice(0, end.index + 1), OPENERS);
    if (ABBREVIATIONS.has(core.toLowerCase())) continue;
    if (DOTTED_ABBREVIATION.test(core)) {
      const first = lstripChars(next[0], OPENERS).codePointAt(0);
      if (!(first !== undefined && isUpper(String.fromCodePoint(first)))) continue;
    }
    starts.push(next.index);
  }
  return starts;
}

/** A piece of a prose block: line number, code point column, text. */
type Piece = [number, number, string];

function longSentenceFindings(pieces: Piece[], file: string): SteFinding[] {
  const offsets: number[] = [];
  let position = 0;
  for (const [, , text] of pieces) {
    offsets.push(position);
    position += text.length + 1;
  }
  const joined = pieces.map((p) => p[2]).join(" ");
  const findings: SteFinding[] = [];
  const starts = sentenceStarts(joined);
  for (let k = 0; k < starts.length; k++) {
    const start = starts[k]!;
    const end = k + 1 < starts.length ? starts[k + 1]! : joined.length;
    const n = countWords(joined.slice(start, end));
    if (n <= MAX_WORDS) continue;
    // bisect_right(offsets, start) - 1
    let lo = 0;
    let hi = offsets.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (start < offsets[mid]!) hi = mid;
      else lo = mid + 1;
    }
    const index = lo - 1;
    const offset = offsets[index]!;
    const [lineno, sourceColumn] = pieces[index]!;
    findings.push({
      file,
      line: lineno,
      col: sourceColumn + cpAt(joined.slice(offset), start - offset) + 1,
      rule: "long-sentence",
      level: "advisory-free",
      match: `${n} words`,
      message: `Sentence has ${n} words (cap ${MAX_WORDS}). Split it.`,
    });
  }
  return findings;
}

const leadingSpaces = (line: string): number => line.length - line.replace(/^ +/, "").length;

function isListContinuation(line: string, contentIndent: number): boolean {
  if (!pyStrip(line)) return true;
  if (LIST_ITEM_START.test(line)) return false;
  return leadingSpaces(line) >= contentIndent;
}

/** Trimmed table cells and their code point columns, or null when the line is not a table row. */
export function splitTableRow(line: string): [string, number][] | null {
  let left = line.length - lstrip(line).length;
  const right = rstrip(line).length;
  let content = line.slice(left, Math.max(left, right));
  if (!content.includes("|")) return null;
  if (content.startsWith("|")) {
    content = content.slice(1);
    left += 1;
  }
  if (content.endsWith("|")) content = content.slice(0, -1);
  const raw = content.split(/(?<!\\)\|/);
  if (raw.length < 2) return null;
  const cells: [string, number][] = [];
  let column = left;
  for (const cell of raw) {
    const leading = cell.length - lstrip(cell).length;
    cells.push([pyStrip(cell), cpAt(line, column + leading)]);
    column += cell.length + 1;
  }
  return cells;
}

function markdownTableCells(lines: string[]): Map<number, [string, number][]> {
  const table = new Map<number, [string, number][]>();
  let index = 1;
  while (index < lines.length) {
    const separator = splitTableRow(lines[index]!);
    const header = splitTableRow(lines[index - 1]!);
    if (!separator || !header || separator.length !== header.length || !separator.every(([c]) => TABLE_SEPARATOR_CELL.test(c))) {
      index++;
      continue;
    }
    table.set(index - 1, header);
    table.set(index, []);
    index++;
    while (index < lines.length) {
      const row = splitTableRow(lines[index]!);
      if (!row || row.length !== separator.length) break;
      table.set(index, row);
      index++;
    }
  }
  return table;
}

function danglingConjunctionFindings(text: string, file: string): SteFinding[] {
  const lines = splitlines(text);
  const findings: SteFinding[] = [];
  let inFence = false;
  let index = 0;
  while (index < lines.length) {
    const line = lines[index]!;
    if (CODE_FENCE.test(pyStrip(line))) {
      inFence = !inFence;
      index++;
      continue;
    }
    if (inFence) {
      index++;
      continue;
    }
    const start = LIST_ITEM_START.exec(line);
    if (!start) {
      index++;
      continue;
    }
    const g = start.groups!;
    const contentIndent = g.indent!.length + g.marker!.length + g.gap!.length;
    const itemLines: [number, string][] = [[index, g.body!]];
    let next = index + 1;
    let itemFence = false;
    while (next < lines.length) {
      const candidate = lines[next]!;
      if (CODE_FENCE.test(pyStrip(candidate))) {
        itemFence = !itemFence;
        next++;
        continue;
      }
      if (itemFence) {
        next++;
        continue;
      }
      if (!isListContinuation(candidate, contentIndent)) break;
      itemLines.push([next, candidate]);
      next++;
    }
    const meaningful: [number, string][] = [];
    for (const [i, l] of itemLines) {
      const cleaned = pyStrip(l.replace(INLINE_CODE, " CODE "));
      if (cleaned) meaningful.push([i, cleaned]);
    }
    if (meaningful.length) {
      const [endIndex, endLine] = meaningful[meaningful.length - 1]!;
      if (CONJUNCTION_END.test(endLine)) {
        let line_: number;
        let col: number;
        if (endIndex === index) {
          line_ = index + 1;
          col = g.indent!.length + 1;
        } else {
          const raw = itemLines.find(([i]) => i === endIndex)![1];
          const masked = maskInlineCode(raw);
          const c = CONJUNCTION_END.exec(masked);
          line_ = endIndex + 1;
          col = c ? cpAt(masked, c.index) + 1 : 1;
        }
        findings.push({
          file,
          line: line_,
          col,
          rule: "dangling-conjunction",
          level: "advisory-free",
          match: endLine,
          message: "List item ends with a coordinating conjunction. Complete the item or join it with the next item.",
        });
      }
    }
    index = next;
  }
  return findings;
}

type Seen = [number, number, string];
const cmpSeen = (a: [Seen, string], b: [Seen, string]): number => {
  const [x, xb] = a;
  const [y, yb] = b;
  return x[0] - y[0] || x[1] - y[1] || (x[2] < y[2] ? -1 : x[2] > y[2] ? 1 : 0) || (xb < yb ? -1 : xb > yb ? 1 : 0);
};

export function lintSte(text: string, file = "<stdin>"): { findings: SteFinding[]; words: number } {
  const findings: SteFinding[] = [];
  let words = 0;
  let inFence = false;
  const html: string[] = [];
  const lines = splitlines(text);
  const tableCells = markdownTableCells(lines);
  const seen = new Map<string, Seen>();
  let block: Piece[] = [];
  let inQuote = false;
  let afterBoundary = true;
  const flush = (): void => {
    findings.push(...longSentenceFindings(block, file));
    block = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const lineno = i + 1;
    const rawLine = lines[i]!;
    if (CODE_FENCE.test(pyStrip(rawLine))) {
      flush();
      inFence = !inFence;
      afterBoundary = true;
      continue;
    }
    if (inFence) continue;
    if (HTML_BLOCK_START.test(lstrip(rawLine))) {
      for (const tag of maskInlineCode(rawLine).matchAll(HTML_BLOCK_TAG)) {
        const name = tag[2]!.toLowerCase();
        if (tag[1]) {
          if (html.includes(name)) {
            while (html.length) if (html.pop() === name) break;
          }
        } else if (!tag[0].endsWith("/>")) html.push(name);
      }
    }
    const isTable = tableCells.has(i);
    const segments: [string, number][] = tableCells.get(i) ?? [[rawLine, 0]];
    const quote = BLOCKQUOTE_PREFIX.exec(rawLine);
    const isQuote = !!quote;
    const content = quote ? rawLine.slice(quote[0].length) : rawLine;
    const alert = !html.length && rawLine.startsWith(">") && afterBoundary && quote![0].split(">").length - 1 === 1 && GITHUB_ALERT.test(pyStrip(content));
    const standalone = STANDALONE_LINE.test(content) || alert;
    if (isTable || !pyStrip(content) || standalone || ANY_LIST_ITEM.test(content) || isQuote !== inQuote) flush();
    inQuote = isQuote;
    afterBoundary = !pyStrip(rawLine);
    for (const [segment, sourceColumn] of segments) {
      const line = maskInlineCode(segment);
      words += pySplit(line).length;
      for (const r of REGEX_RULES) {
        for (const m of line.matchAll(r.pattern!)) {
          if (r.id === "present-perfect" && MODAL_PERFECT_PREFIX.test(line.slice(0, m.index))) continue;
          findings.push({ file, line: lineno, col: sourceColumn + cpAt(line, m.index) + 1, rule: r.id, level: r.level, match: m[0], message: r.message });
        }
      }
      SYNONYM_GROUPS.forEach((group, gi) => {
        group.forEach((base, bi) => {
          const key = `${gi} ${base}`;
          if (seen.has(key)) return;
          const m = WORD_RES[gi]![bi]!.exec(line);
          if (m) seen.set(key, [lineno, sourceColumn + cpAt(line, m.index) + 1, m[0]]);
        });
      });
      // the blockquote prefix and the list marker are markup, not words in the sentence
      let skip = quote && !isTable ? quote[0].length : 0;
      const marker = isTable ? null : ANY_LIST_ITEM.exec(segment.slice(skip));
      if (marker) skip += marker[0].length;
      const rest = line.slice(skip);
      if (pyStrip(rest)) block.push([lineno, sourceColumn + skip, rest]);
      if (isTable) flush(); // each table cell is its own block
    }
    if (standalone) flush();
  }
  flush();
  // synonym rotation: flag each member after the first, at its first occurrence
  SYNONYM_GROUPS.forEach((group, gi) => {
    const present: [Seen, string][] = group.filter((b) => seen.has(`${gi} ${b}`)).map((b) => [seen.get(`${gi} ${b}`)!, b]);
    if (present.length > 1) {
      present.sort(cmpSeen);
      const firstBase = present[0]![1];
      for (const [[lineno, col, match], base] of present.slice(1)) {
        findings.push({ file, line: lineno, col, rule: "synonym-rotation", level: "advisory-free", match, message: `'${base}' and '${firstBase}' name the same action. Pick one and use it every time.` });
      }
    }
  });
  findings.push(...danglingConjunctionFindings(text, file));
  findings.sort((a, b) => a.line - b.line || a.col - b.col);
  return { findings, words };
}
