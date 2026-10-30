// REQ-QRY-003 canonical text with one provenance line per block, in a fixed order, within a budget.
import { join } from "node:path";
import { canon } from "../index/canonical.ts";
import { blockRange, readText } from "../index/scan.ts";
import type { Entry } from "../index/types.ts";
import { cmpTuple, cpLen, pyStrip, splitLines } from "../util/pystr.ts";
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

/** REQ-QRY-004 the canonical blocks of requirements, joined by one blank line, with no provenance line. */
export function reqBlocks(root: string, reqs: Entry[]): string {
  const files = new Lines(root);
  return reqs.map((e) => blockText(e, files)).join("\n");
}

export interface BundleResult {
  text: string;
  omitted: string[];
}

/** REQ-QRY-012 the budget class of a block (046/D7). A lower class keeps its place first. */
function budgetClass(e: Entry, requested: boolean, hit: Hit | undefined): number {
  if (requested) return 0;
  if (!hit || hit.depth >= 2) return 3;
  if (e.kind === "code" || e.kind === "test") return 1;
  if (e.kind === "decision" && e.status === "archived") return 3;
  return 2;
}

export function bundle(root: string, entries: Entry[], wanted: string[], budget: number, depth: number, all = false): BundleResult {
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
  const found = new Map<string, Hit>();
  for (const i of wanted) {
    // decisions that reference a requested ID are included at every depth, as depth 1
    for (const e of entries) {
      if (e.kind === "decision" && e.refs.includes(i) && !found.has(e.id)) found.set(e.id, { reason: `decision for ${i}`, depth: 1 });
    }
    for (const [r, hit] of walkFound(entries, i, depth, all)) {
      if (!wanted.includes(r) && !found.has(r)) found.set(r, hit);
    }
  }
  // scenarios print inside their requirement
  const tail = [...found.keys()].filter((r) => ids.has(r) && ids.get(r)!.kind !== "scn");
  tail.sort((a, b) => cmpTuple([KIND_RANK[ids.get(a)!.kind] ?? 9, a], [KIND_RANK[ids.get(b)!.kind] ?? 9, b]));
  for (const r of tail) {
    const hit = found.get(r)!;
    const e = ids.get(r)!;
    const cls = budgetClass(e, false, hit);
    blocks.push([e, hit.reason, cls]);
    const m = all ? undefined : mainVersion(entries, r);
    if (m) blocks.push([m, `main version of ${r}`, cls]);
  }
  const files = new Lines(root);
  const texts = blocks.map(([e, reason]) => {
    const body = blockText(e, files);
    // a blank line closes a block with a body. Code and test paths stay one line each.
    return provenance(e, reason) + body + (body ? "\n" : "");
  });
  // fill the budget class by class, in print order inside a class, and skip a block that does not fit
  const keep = blocks.map(() => false);
  let used = 0;
  for (let cls = 0; cls <= 3; cls++) {
    for (let k = 0; k < blocks.length; k++) {
      if (blocks[k]![2] !== cls) continue;
      const n = cpLen(texts[k]!);
      if (used + n > budget) continue;
      keep[k] = true;
      used += n;
    }
  }
  const omitted = blocks.filter((_, k) => !keep[k]).map(([e]) => e.id);
  let text = texts.filter((_, k) => keep[k]).join("");
  if (omitted.length) text += `truncated: ${omitted.length} entries omitted: ${omitted.join(", ")}\n`;
  return { text, omitted };
}
