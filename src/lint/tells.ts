// REQ-LINT-001 REQ-LINT-002 tells-lint: the AI writing tells a regex can see. A port of scripts/tells-lint.py, rule by rule.
import { B, cpLen, cpSlice, D, esc, lineIndex, NS, pyStrip, re, S, splitlines } from "./py.ts";

export interface Rule {
  id: string;
  level: "hard" | "advisory";
  /** null for a rule that code checks, not a pattern. */
  pattern: RegExp | null;
  message: string;
}

export interface TellsFinding {
  rule: string;
  level: string;
  line: number;
  match: string;
}

const STOCK_WORDS = [
  "additionally", "align with", "bolster", "crucial", "deep dive", "delve",
  "enduring", "enhance", "garner", "interplay", "intricate", "intricacies",
  "leverage", "meticulous", "meticulously", "pivotal", "seamless", "seamlessly",
  "showcase", "tapestry", "testament", "underscore", "underscores", "vibrant",
  "game-changer", "game changer", "cutting-edge", "cutting edge",
];

// REQ-LINT-001 stock words that take verb or noun inflections, as in the oracle.
const STOCK_VERBS = new Set(["align with", "bolster", "delve", "enhance", "garner", "leverage", "showcase", "underscore"]);
const STOCK_NOUNS = new Set(["deep dive", "game-changer", "game changer", "interplay", "tapestry", "testament"]);

/** The pattern for one stock word with its inflections. */
function stockPattern(word: string): string {
  if (STOCK_VERBS.has(word)) {
    const i = word.indexOf(" ");
    const head = i < 0 ? word : word.slice(0, i);
    const tail = i < 0 ? "" : word.slice(i + 1);
    const core = head.endsWith("e") ? `${esc(head.slice(0, -1))}(?:e|es|ed|ing)` : `${esc(head)}(?:s|es|ed|ing)?`;
    return core + (i < 0 ? "" : `${S}+${esc(tail)}`);
  }
  if (STOCK_NOUNS.has(word)) return `${esc(word)}(?:s|es)?`;
  return esc(word);
}

const SALES_WORDS = ["nestled", "breathtaking", "renowned", "must-visit", "stunning", "diverse array", "in the heart of", "profound"];

const CHAT_RESIDUE = [
  "great question", "i hope this helps", `${B}of course!`, `${B}certainly!`,
  "you're absolutely right", "would you like me to", "want me to",
  "let me know if", "should i continue",
];

const RUN_UP = [
  "let'?s dive in", "let'?s explore", "let'?s break this down",
  "here'?s what you need to know", "without further ado", "here'?s the thing",
  "the thing is,", "real talk", "let'?s be honest",
];

const DEEP_SAYINGS = [
  `${B}at its core${B}`, `${B}the real question is${B}`, `${B}what really matters${B}`,
  `${B}the heart of the matter${B}`, `${B}is the (?:language|currency|architecture) of${B}`,
];

const words = (ws: string[]): string => `${B}(?:${ws.map(esc).join("|")})${B}`;

export const TELLS_RULES: Rule[] = [
  // hard rules
  { id: "dash", level: "hard", pattern: re(`—|–|(?<=${NS}) -- (?=${NS})|${S}--${S}`, "g"), message: "An em dash, en dash, or double hyphen." },
  {
    id: "not-x-but-y",
    level: "hard",
    pattern: re(`${B}(?:not|isn'?t|aren'?t|wasn'?t|it'?s not)${S}+(?:just|only|merely|simply|about)?${S}*[^.?!;:]{1,60}?[,;]?${S}+but${S}+(?:rather${S}+)?(?:also${S}+)?`, "gi"),
    message: "A not X but Y contrast.",
  },
  // REQ-LINT-001 the oracle accepts , . : ; an em or en dash, or a spaced hyphen before "it's" or "it is".
  { id: "not-x-its-y", level: "hard", pattern: re(`${B}(?:it'?s|this is|that'?s) not [^.?!]{1,60}?(?:[,.:;]|${S}-(?=${S})|${S}*[—–])${S}*(?:it'?s|it is|this is|that'?s)${B}`, "gi"), message: "A not X, it is Y contrast." },
  { id: "chat-residue", level: "hard", pattern: re(CHAT_RESIDUE.join("|"), "gi"), message: "Chat text left in the document." },
  { id: "run-up", level: "hard", pattern: re(RUN_UP.join("|"), "gi"), message: "A run up before the point." },
  { id: "deep-saying", level: "hard", pattern: re(DEEP_SAYINGS.join("|"), "gi"), message: "A deep saying." },
  { id: "stock-word", level: "hard", pattern: re(`${B}(?:${STOCK_WORDS.map(stockPattern).join("|")})${B}`, "gi"), message: "A stock AI word." },
  { id: "bold-label", level: "hard", pattern: re(`^${S}*(?:[-*+]|${D}+[.)])${S}+\\*\\*[^*\\n]+?(?::\\*\\*|\\*\\*${S}*:)`, "gm"), message: "A list item that starts with a bold label." },
  { id: "emoji-heading", level: "hard", pattern: re(`^#{1,6}${S}*[\\u{1F300}-\\u{1FAFF}\\u2600-\\u27BF]`, "gm"), message: "A heading that starts with an emoji." },
  // advisory rules
  { id: "sales-word", level: "advisory", pattern: re(words(SALES_WORDS), "gi"), message: "A sales word." },
  { id: "title-case-heading", level: "advisory", pattern: re(`^#{1,6}${S}+(?:[A-Z][a-z]+${S}+){2,}[A-Z][a-z]+${S}*$`, "gm"), message: "A heading in title case." },
  { id: "stacked-qualifier", level: "advisory", pattern: re(`${B}(?:could|might|may)${S}+(?:potentially|possibly|arguably)${S}+(?:potentially|possibly|arguably|be)${B}`, "gi"), message: "Stacked qualifiers." },
  { id: "serves-as", level: "advisory", pattern: re(`${B}(?:serves as|stands as|functions as|boasts|represents a)${B}`, "gi"), message: "A serves as phrase in place of is." },
  { id: "closer", level: "advisory", pattern: re(`^(?:That is the real win|That distinction matters|Read that again|Let that sink in)\\.?${S}*$`, "gim"), message: "A one line closer." },
  { id: "repeated-closer", level: "advisory", pattern: null, message: "The same short paragraph two or more times." },
];

export const TELLS_IDS = TELLS_RULES.map((r) => r.id);

const FENCE = re(`^${S}*(\`\`\`|~~~)`);
const INLINE_CODE = re("`[^`\\n]*`", "g");
const URL = re(`https?://${NS}+|${NS}+/${NS}+`, "g");

/** Blank fenced code, inline code, and URLs. Line numbers stay true. */
export function stripCode(text: string): string {
  const out: string[] = [];
  let fenced = false;
  for (let line of splitlines(text)) {
    if (FENCE.test(line)) {
      fenced = !fenced;
      out.push("");
      continue;
    }
    if (fenced) {
      out.push("");
      continue;
    }
    line = line.replace(INLINE_CODE, " ").replace(URL, " ");
    out.push(line);
  }
  return out.join("\n");
}

export function lintTells(text: string, disabled: ReadonlySet<string> = new Set()): TellsFinding[] {
  const clean = stripCode(text);
  const lineOf = lineIndex(clean);
  const findings: TellsFinding[] = [];
  for (const r of TELLS_RULES) {
    if (disabled.has(r.id) || r.pattern === null) continue;
    r.pattern.lastIndex = 0;
    for (const m of clean.matchAll(r.pattern)) {
      findings.push({ rule: r.id, level: r.level, line: lineOf(m.index), match: cpSlice(pyStrip(m[0]), 80) });
    }
  }
  if (!disabled.has("repeated-closer")) {
    const paras = clean.split(re(`\\n${S}*\\n`)).map(pyStrip).filter(Boolean);
    const seen = new Map<string, number>();
    for (const p of paras) {
      if (cpLen(p) < 60 && !p.includes("\n") && !p.startsWith("#")) seen.set(p, (seen.get(p) ?? 0) + 1);
    }
    for (const [p, n] of seen) {
      if (n >= 2) findings.push({ rule: "repeated-closer", level: "advisory", line: lineOf(clean.indexOf(p)), match: p });
    }
  }
  // stable sort by (line, rule), as Python sorts
  return findings.sort((a, b) => a.line - b.line || (a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : 0));
}
