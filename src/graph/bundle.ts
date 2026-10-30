// REQ-QRY-003 canonical text with one provenance line per block, in a fixed order, within a budget.
import { join } from "node:path";
import { canon } from "../index/canonical.ts";
import { blockRange, readText } from "../index/scan.ts";
import type { Entry } from "../index/types.ts";
import { cmpTuple, cpLen, pyStrip, splitLines } from "../util/pystr.ts";
import { KIND_RANK, related } from "./related.ts";

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
  if (e.kind === "code" || e.kind === "test") return "";
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

export function bundle(root: string, entries: Entry[], wanted: string[], budget: number, depth: number, all = false): BundleResult {
  const ids = canon(entries);
  const blocks: [Entry, string][] = [];
  for (const i of wanted) {
    // REQ-QRY-005 a path has no block of its own. Its links come from related below.
    if (!ids.has(i)) continue;
    const copies = [ids.get(i)!];
    if (all) copies.push(...entries.filter((e) => e.id === i && !e.canonical));
    for (const e of copies) blocks.push([e, "requested"]);
  }
  const found = new Map<string, string>();
  for (const i of wanted) {
    // decisions that reference a requested ID are included at every depth
    for (const e of entries) {
      if (e.kind === "decision" && e.refs.includes(i) && !found.has(e.id)) found.set(e.id, `decision for ${i}`);
    }
    for (const [r, reason] of related(entries, i, depth, all)) {
      if (!wanted.includes(r) && !found.has(r)) found.set(r, reason);
    }
  }
  // scenarios print inside their requirement
  const tail = [...found.keys()].filter((r) => ids.has(r) && ids.get(r)!.kind !== "scn");
  tail.sort((a, b) => cmpTuple([KIND_RANK[ids.get(a)!.kind] ?? 9, a], [KIND_RANK[ids.get(b)!.kind] ?? 9, b]));
  for (const r of tail) blocks.push([ids.get(r)!, found.get(r)!]);
  const files = new Lines(root);
  const out: string[] = [];
  const omitted: string[] = [];
  let used = 0;
  for (const [e, reason] of blocks) {
    const body = blockText(e, files);
    // a blank line closes a block with a body. Code and test paths stay one line each.
    const t = provenance(e, reason) + body + (body ? "\n" : "");
    const n = cpLen(t);
    if (used + n > budget) {
      omitted.push(e.id);
      continue;
    }
    out.push(t);
    used += n;
  }
  let text = out.join("");
  if (omitted.length) text += `truncated: ${omitted.length} entries omitted: ${omitted.join(", ")}\n`;
  return { text, omitted };
}
