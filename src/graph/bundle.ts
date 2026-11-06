// REQ-QRY-003 canonical text with one provenance line per block, in a fixed order, within a budget.
import { statSync } from "node:fs";
import { isAbsolute, join, normalize } from "node:path";
import { canon, poolOf } from "../index/canonical.ts";
import { blockRange, readText } from "../index/scan.ts";
import type { Entry } from "../index/types.ts";
import { cmpStr, cmpTuple, cpLen, pyStrip, splitLines } from "../util/pystr.ts";
import { KIND_RANK, mainVersion, walkFound, type Hit } from "./related.ts";

export class Lines {
  private cache = new Map<string, string[]>();
  private root: string;
  constructor(root: string) {
    this.root = root;
  }
  get(rpath: string): string[] {
    let l = this.cache.get(rpath);
    if (!l) this.cache.set(rpath, (l = splitLines(readText(join(this.root, rpath)))));
    return l;
  }
}

/** Markdown text of an entry. Code and test entries print no body, only their provenance line. */
export function blockText(e: Entry, files: Lines): string {
  // REQ-QRY-009 a capability or a change prints its provenance line only
  if (e.kind === "code" || e.kind === "test" || e.kind === "cap" || e.kind === "change") return "";
  const lines = files.get(e.file);
  const start = e.line - 1;
  if (e.kind === "task") return pyStrip(lines[start] ?? "") + "\n";
  if (e.kind === "decision") {
    const out = [lines[start] ?? ""];
    for (const line of lines.slice(start + 1)) {
      if (!pyStrip(line) || line.startsWith("- ") || line.startsWith("#")) break;
      out.push(line);
    }
    return rstrip(out.join("\n")) + "\n";
  }
  const [s, end] = blockRange(lines, start);
  return rstrip(lines.slice(s, end).join("\n")) + "\n";
}

function rstrip(s: string): string {
  const t = pyStrip("x" + s);
  return t.slice(1);
}

export function provenance(e: Entry, reason: string): string {
  return `-- ${e.id} | ${e.file}:${e.line} | ${e.status} | ${reason}\n`;
}

/** REQ-JRN-002 the ID of a provenance line, or null. It anchors on the start of `provenance()` (057/D3). */
export function parseProvenance(line: string): string | null {
  const m = /^-- (\S+) \| /.exec(line);
  return m ? m[1]! : null;
}

/** REQ-QRY-004 the canonical blocks of requirements, joined by one blank line, with no provenance line. */
export function reqBlocks(root: string, reqs: Entry[]): string {
  const files = new Lines(root);
  return reqs.map((e) => blockText(e, files)).join("\n");
}

// REQ-QRY-019 the completeness fields. complete says that no card and no body dropped, not that the text fits.
export interface BundleResult {
  text: string;
  /** The IDs that lost their card, in print order. */
  omitted: string[];
  /** REQ-QRY-020 the IDs whose card ends with the marker, in print order. */
  body_omitted: string[];
  /** The code point length of text, with the trailer lines. */
  chars: number;
  /** null in block mode, where no budget applies (050/D6). */
  budget: number | null;
  complete: boolean;
}

/** REQ-QRY-012 the budget class of a block (046/D7). A lower class keeps its place first. */
function budgetClass(e: Entry, requested: boolean, hit: Hit | undefined): number {
  if (requested) return 0;
  if (!hit || hit.depth >= 2) return 3;
  if (e.kind === "code" || e.kind === "test") return 1;
  if (e.kind === "decision" && e.status === "archived") return 3;
  return 2;
}

export interface BundleOpts {
  all?: boolean;
  /** 047/D5 the task entry that the caller found. It wins over a task with the same ID that canon() holds. */
  task?: Entry;
}

/**
 * REQ-QRY-016 REQ-QRY-017 the requirements that the task cites or that the file tags, and the code and test
 * entries of each, from one pass over the pool (047/D3, 047/D7). The entries get depth 1.
 */
function reach(entries: Entry[], ids: Map<string, Entry>, wanted: string[], all: boolean): { cited: string[]; lines: Map<string, Hit> } {
  const cited: string[] = [];
  const tagged: string[] = [];
  const add = (list: string[], r: string): void => {
    if (ids.get(r)?.kind === "req" && !cited.includes(r) && !tagged.includes(r)) list.push(r);
  };
  const pool = poolOf(entries, all);
  for (const i of wanted) {
    const e = ids.get(i);
    if (e?.kind === "task") for (const r of e.refs) add(cited, r);
    // a requested input that is no ID is a path. Only the tags of the file count, not a mention in a task line.
    else if (!e) for (const x of pool) if (x.file === i && (x.kind === "code" || x.kind === "test")) for (const r of x.refs) add(tagged, r);
  }
  const lines = new Map<string, Hit>();
  if (!cited.length && !tagged.length) return { cited, lines };
  const want = new Set([...cited, ...tagged]);
  const back = new Map<string, Entry[]>();
  for (const x of pool) {
    if (x.kind !== "code" && x.kind !== "test") continue;
    for (const r of x.refs) {
      if (!want.has(r)) continue;
      let l = back.get(r);
      if (!l) back.set(r, (l = []));
      l.push(x);
    }
  }
  for (const r of [...cited, ...tagged]) {
    for (const x of (back.get(r) ?? []).sort((a, b) => cmpStr(a.id, b.id))) {
      if (!lines.has(x.id)) lines.set(x.id, { reason: `${x.kind === "code" ? "implements" : "covers"} ${r}`, depth: 1 });
    }
  }
  return { cited, lines };
}

export function bundle(root: string, entries0: Entry[], wanted: string[], budget: number, depth: number, opts: BundleOpts = {}): BundleResult {
  const all = !!opts.all;
  // 047/D5 the entry that the caller found stands for its ID. It goes last, so canon() holds it.
  const entries = opts.task && canon(entries0).get(opts.task.id) !== opts.task ? [...entries0.filter((e) => e !== opts.task), opts.task] : entries0;
  const ids = canon(entries);
  // block, reason, class. The array is in print order.
  const blocks: [Entry, string, number][] = [];
  for (const i of wanted) {
    // REQ-QRY-005 a path has no block of its own. Its links come from related below.
    if (!ids.has(i)) continue;
    const copies = [ids.get(i)!];
    if (all) copies.push(...entries.filter((e) => e.id === i && !e.canonical));
    for (const e of copies) blocks.push([e, "requested", 0]);
    // REQ-QRY-010 the main version of a modified requirement, also for a requested ID
    const m = all ? undefined : mainVersion(entries, i);
    if (m) blocks.push([m, `main version of ${i}`, 0]);
  }
  // REQ-QRY-018 the count of blocks that the loop above pushed. They print first and always stay.
  const pinned = blocks.length;
  const found = new Map<string, Hit>();
  for (const i of wanted) {
    // decisions that reference a requested ID are included at every depth, as depth 1.
    // REQ-QRY-016 They replace a deeper hit, which the walk for an earlier requested ID can leave (048/D1).
    for (const e of entries) {
      // REQ-QRY-014 a requested decision prints once, as requested (050/D10)
      if (e.kind !== "decision" || !e.refs.includes(i) || wanted.includes(e.id)) continue;
      const cur = found.get(e.id);
      if (!cur || cur.depth > 1) found.set(e.id, { reason: `decision for ${i}`, depth: 1 });
    }
    for (const [r, hit] of walkFound(entries, i, depth, all)) {
      if (!wanted.includes(r) && !found.has(r)) found.set(r, hit);
    }
  }
  // REQ-QRY-016 REQ-QRY-017 the cited requirements, their decisions, and the lines of the requirements of a task or a file
  const r = depth >= 1 ? reach(entries, ids, wanted, all) : { cited: [] as string[], lines: new Map<string, Hit>() };
  const citedSet = new Set(r.cited);
  for (const t of wanted) {
    const te = ids.get(t);
    if (te?.kind !== "task") continue;
    for (const c of te.refs) if (citedSet.has(c) && !wanted.includes(c) && !found.has(c)) found.set(c, { reason: `ref from ${t}`, depth: 1 });
  }
  for (const c of r.cited) {
    for (const e of entries) {
      if (e.kind !== "decision" || !e.refs.includes(c) || wanted.includes(e.id)) continue;
      const cur = found.get(e.id);
      if (!cur || cur.depth > 1) found.set(e.id, { reason: `decision for ${c}`, depth: 1 });
    }
  }
  for (const [id, hit] of r.lines) {
    const cur = found.get(id);
    if (!wanted.includes(id) && (!cur || cur.depth > 1)) found.set(id, hit);
  }
  // scenarios print inside their requirement
  const tail = [...found.keys()].filter((x) => ids.has(x) && ids.get(x)!.kind !== "scn");
  tail.sort((a, b) => cmpTuple([KIND_RANK[ids.get(a)!.kind] ?? 9, a], [KIND_RANK[ids.get(b)!.kind] ?? 9, b]));
  for (const r2 of tail) {
    const hit = found.get(r2)!;
    const e = ids.get(r2)!;
    const cls = citedSet.has(r2) ? 0 : budgetClass(e, false, hit);
    blocks.push([e, hit.reason, cls]);
    const m = all ? undefined : mainVersion(entries, r2);
    if (m) blocks.push([m, `main version of ${r2}`, cls]);
  }
  const files = new Lines(root);
  // REQ-QRY-020 one state per block: 0 none, 1 card, 2 full. The fill sets it and the output reads it in print order.
  const blk: Blk[] = blocks.map(([e, reason, cls]) => {
    const body = blockText(e, files);
    return { id: e.id, head: provenance(e, reason), body: body ? body + "\n" : "", cls, st: 0 };
  });
  // REQ-QRY-021 the files that a requested task names, as class 1 cards after the code and test lines (060/D4)
  const named: Blk[] = [];
  if (depth >= 1) {
    const taken = new Set(blocks.filter(([e]) => e.kind === "code" || e.kind === "test").map(([e]) => e.file));
    for (const t of wanted) {
      const te = ids.get(t);
      if (te?.kind !== "task") continue;
      for (const path of te.paths ?? []) {
        if (taken.has(path) || !isFile(root, path)) continue;
        taken.add(path);
        named.push({ id: path, head: `-- ${path} | ${path} | active | named by ${t}\n`, body: "", cls: 1, st: 0 });
      }
    }
  }
  // the pinned blocks can hold a change, whose rank is above test, so the search starts after them
  let at = blocks.findIndex(([e], k) => k >= pinned && (KIND_RANK[e.kind] ?? 9) > KIND_RANK.test!);
  if (at < 0) at = blk.length;
  blk.splice(Math.max(at, pinned), 0, ...named);
  // REQ-QRY-018 the pinned blocks always stay, with their bodies (050/D2, 050/D3)
  for (let k = 0; k < pinned; k++) blk[k]!.st = 2;
  let used = 0;
  for (let k = 0; k < pinned; k++) used += cpLen(render(blk[k]!));
  const cost = (b: Blk, st: number): number => cpLen(renderAs(b, st));
  // fill in five steps, in print order inside each: cards of class 0, cards of class 1, bodies of class 0, cards of class 2, bodies of class 2
  const cards = (cls: number): void => {
    for (let k = pinned; k < blk.length; k++) {
      const b = blk[k]!;
      if (b.cls !== cls || b.st) continue;
      const st = b.body ? 1 : 2;
      const n = cost(b, st);
      if (used + n > budget) continue;
      b.st = st;
      used += n;
    }
  };
  const bodies = (cls: number): void => {
    for (let k = pinned; k < blk.length; k++) {
      const b = blk[k]!;
      if (b.cls !== cls || b.st !== 1) continue;
      const d = cost(b, 2) - cost(b, 1);
      if (used + d > budget) continue;
      b.st = 2;
      used += d;
    }
  };
  cards(0);
  cards(1);
  bodies(0);
  cards(2);
  bodies(2);
  // class 3 fills as a whole block
  for (let k = pinned; k < blk.length; k++) {
    const b = blk[k]!;
    if (b.cls !== 3) continue;
    const n = cost(b, 2);
    if (used + n > budget) continue;
    b.st = 2;
    used += n;
  }
  const omitted = blk.filter((b) => !b.st).map((b) => b.id);
  const bodyOmitted = blk.filter((b) => b.st === 1).map((b) => b.id);
  // REQ-QRY-022 the note of the first requested task with no requirement that the index holds. It prints after the pinned blocks.
  let note = "";
  if (depth >= 1) {
    const t = wanted.find((w) => {
      const te = ids.get(w);
      return te?.kind === "task" && !te.refs.some((x) => ids.get(x)?.kind === "req");
    });
    if (t) note = `note: ${t} cites no requirement that the index holds. The blocks come from its change and the paths it names. Add a [REQ-...] citation.\n`;
  }
  const out = blk.map((b) => render(b));
  let text = out.slice(0, pinned).join("") + note + out.slice(pinned).join("");
  // the budget counts the blocks, so the figure of the over budget line is their length
  used = out.reduce((n, x) => n + cpLen(x), 0);
  if (omitted.length) text += `truncated: ${omitted.length} entries omitted: ${omitted.join(", ")}\n`;
  // REQ-QRY-018 the over budget line goes last, so the 0.4.1 output stays a prefix (050/D4)
  if (used > budget) text += `over budget: ${used} of ${budget} characters\n`;
  return { text, omitted, body_omitted: bodyOmitted, chars: cpLen(text), budget, complete: omitted.length === 0 && bodyOmitted.length === 0 };
}

/** REQ-QRY-020 a block with its head, its body, and its state: 0 none, 1 card, 2 full. */
interface Blk {
  id: string;
  head: string;
  body: string;
  cls: number;
  st: number;
}

const MARKER = " | body omitted";

function renderAs(b: Blk, st: number): string {
  if (st === 0) return "";
  if (st === 1 && b.body) return b.head.slice(0, -1) + MARKER + "\n";
  return b.head + b.body;
}

function render(b: Blk): string {
  return renderAs(b, b.st);
}

/** REQ-QRY-021 true when the path is a file under the root. */
function isFile(root: string, path: string): boolean {
  const n = normalize(path);
  if (isAbsolute(n) || n.startsWith("..")) return false;
  try {
    return statSync(join(root, n)).isFile();
  } catch {
    return false;
  }
}
