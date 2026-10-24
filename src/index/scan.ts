// REQ-IDX-001 scan of specs, changes, decisions, code, and tests.
import { lstatSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Config } from "../config.ts";
import { anyMatch, globBase, globRe } from "../util/glob.ts";
import { cmpStr, pyStrip, splitLines, squash } from "../util/pystr.ts";
import type { Entry, Problem, Scanned, Status } from "./types.ts";

// Every pattern is ASCII only. `[ \t\n\r\f\v]` is the ASCII whitespace class of the Python oracle.
const S = "[ \\t\\n\\r\\f\\v]";
export const ID_RE = /\b(REQ-[A-Z]{2,6}-\d{3}|SCN-[A-Z]{2,6}-\d{3}-\d+|ADR-\d{3})\b/g;
const ID_FULL = /^(?:REQ-[A-Z]{2,6}-\d{3}|SCN-[A-Z]{2,6}-\d{3}-\d+|ADR-\d{3})$/;
const SCN_RE = /\bSCN-[A-Z]{2,6}-\d{3}-\d+\b/g;
const REQ_HDR = new RegExp(`^### Requirement:${S}*(REQ-[A-Z]{2,6}-\\d{3})?${S}*(.*)$`, "s");
const SCN_HDR = new RegExp(`^#### Scenario:${S}*(SCN-[A-Z]{2,6}-\\d{3}-\\d+)?${S}*(.*)$`, "s");
const ADR_HDR = new RegExp(`^# (ADR-\\d{3})${S}+(.*)$`, "s");
const REFS_RE = new RegExp(`^Refs:${S}*(.+)$`, "s");
const TASK_REQ = new RegExp(`\\[(REQ-[A-Z]{2,6}-\\d{3}(?:${S}*,${S}*REQ-[A-Z]{2,6}-\\d{3})*)\\]`, "g");
const CODE_TAG = new RegExp(`(?://|#|/\\*|\\*)${S}*(REQ-[A-Z]{2,6}-\\d{3})`);
const COVER_TAG = new RegExp(`Covers:${S}*(REQ-[A-Z]{2,6}-\\d{3}(?:${S}*,${S}*REQ-[A-Z]{2,6}-\\d{3})*)`);
const SENTENCE_END = new RegExp(`(?<=[.!?])${S}`);
const COMMA = new RegExp(`${S}*,${S}*`);
const SKIP_DIRS = new Set(["node_modules", ".git"]);

export type FileKind = "md" | "src";
export interface ScanFile {
  path: string; // relative, forward slashes
  kind: FileKind;
}

export interface Scanner {
  root: string;
  md: RegExp[];
  src: RegExp[];
  tests: RegExp[];
  ignore: RegExp[];
  bases: string[];
  taskRe: RegExp;
}

export function scanner(root: string, cfg: Config): Scanner {
  const s = cfg.scan;
  const all = [...s.specs, ...s.changes, ...s.decisions, ...s.code, ...s.tests];
  return {
    root,
    md: [...s.specs, ...s.changes, ...s.decisions].map(globRe),
    src: [...s.code, ...s.tests].map(globRe),
    tests: s.tests.map(globRe),
    ignore: s.ignore.map(globRe),
    bases: [...new Set(all.map(globBase))].sort(cmpStr),
    taskRe: new RegExp(`^${S}*- \\[([ xX]?)\\]${S}*(${cfg.ids.task_pattern})${S}+(.*)$`, "s"),
  };
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** Files that match the scan globs, sorted by path. The walk reads no file contents. */
export function walk(sc: Scanner): ScanFile[] {
  const seen = new Map<string, FileKind>();
  const visit = (abs: string, rel: string): void => {
    let names: string[];
    try {
      names = readdirSync(abs).sort(cmpStr);
    } catch {
      return;
    }
    const pre = rel === "" ? "" : rel + "/";
    const dirs: string[] = [];
    for (const name of names) {
      const p = join(abs, name);
      let dir: boolean;
      let link = false;
      try {
        const st = lstatSync(p);
        link = st.isSymbolicLink();
        dir = link ? isDir(p) : st.isDirectory();
      } catch {
        continue;
      }
      if (dir) {
        // a link to a directory is listed but not followed, as os.walk does
        if (!link && !SKIP_DIRS.has(name) && !anyMatch(sc.ignore, `${pre}${name}/`)) dirs.push(name);
        continue;
      }
      const path = pre + name;
      if (seen.has(path) || anyMatch(sc.ignore, path)) continue;
      if (anyMatch(sc.md, path)) seen.set(path, "md");
      else if (anyMatch(sc.src, path)) seen.set(path, "src");
    }
    for (const d of dirs) visit(join(abs, d), pre + d);
  };
  for (const base of sc.bases) {
    const top = base ? join(sc.root, base) : sc.root;
    if (isDir(top)) visit(top, base);
  }
  return [...seen.keys()].sort(cmpStr).map((path) => ({ path, kind: seen.get(path)! }));
}

/** REQ-IDX-004 count and newest mtime in integer milliseconds, from stat calls only. */
export function scannedOf(root: string, files: ScanFile[]): Scanned {
  let newest = 0;
  for (const f of files) {
    try {
      const ms = Number(statSync(join(root, f.path), { bigint: true }).mtimeNs / 1000000n);
      if (ms > newest) newest = ms;
    } catch {
      // a file removed during the walk does not count
    }
  }
  return { count: files.length, newest_mtime_ms: newest };
}

export function changeOf(path: string): string {
  const m = /^openspec\/changes\/(archive\/)?([^/]+)\//.exec(path);
  if (!m) return "main";
  let name = m[2]!;
  // openspec archive prefixes the folder with a date: 2026-10-23-001-foundation
  if (m[1]) name = name.replace(/^\d{4}-\d{2}-\d{2}-/, "");
  return name;
}

/** ADR-002: task and decision IDs use the number prefix of the change folder. */
export function changeNum(change: string): string {
  return change.split("-")[0]!;
}

export function readText(abs: string): string {
  return readFileSync(abs).toString("utf8");
}

function fenceToggle(line: string): boolean {
  const t = pyStrip(line);
  return t.startsWith("```") || t.startsWith("~~~");
}

/** Line range of a markdown block from its header to the next header of the same or a higher level. */
export function blockRange(lines: string[], start: number): [number, number] {
  const hdr = lines[start]!;
  const level = hdr.startsWith("#") ? hdr.length - hdr.replace(/^#+/, "").length : 6;
  let end = start + 1;
  let inFence = false;
  while (end < lines.length) {
    const line = lines[end]!;
    if (fenceToggle(line)) inFence = !inFence;
    else if (!inFence && line.startsWith("#")) {
      const lvl = line.length - line.replace(/^#+/, "").length;
      if (lvl <= level) break;
    }
    end++;
  }
  return [start, end];
}

interface Pending extends Entry {
  _lines?: string[];
}

function entry(e: Omit<Entry, "canonical" | "text"> & { text?: string }): Pending {
  return { text: "", canonical: false, ...e } as Pending;
}

export function scanMarkdown(sc: Scanner, rpath: string, entries: Entry[], problems: Problem[]): void {
  const lines = splitLines(readText(join(sc.root, rpath)));
  const change = changeOf(rpath);
  const status: Status = rpath.includes("/archive/") ? "archived" : "active";
  const isDesign = rpath.endsWith("design.md");
  const isTasks = rpath.endsWith("tasks.md");
  let curReq: string | null = null;
  let curEntry: Pending | null = null;
  let inFence = false;
  let section = "";
  let decision: Pending | null = null;
  const decisions: Pending[] = [];
  const blocks: Pending[] = [];
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n]!;
    const i = n + 1;
    if (fenceToggle(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (decision !== null) {
      // a decision bullet runs until a blank line, the next bullet, or a header
      if (pyStrip(line) && !line.startsWith("- ") && !line.startsWith("#")) {
        decision._lines!.push(pyStrip(line));
        continue;
      }
      decision = null;
    }
    if (line.startsWith("## ")) {
      // delta section of an active change: ADDED, MODIFIED, REMOVED, RENAMED. Also Decisions in design.md.
      section = pyStrip(line.slice(3)).split(" ")[0]!.toUpperCase();
      continue;
    }
    if (isDesign && section === "DECISIONS" && line.startsWith("- ")) {
      decision = entry({
        id: `${changeNum(change)}/D${decisions.length + 1}`, kind: "decision", file: rpath, line: i,
        title: "", change, status, refs: [],
      });
      decision._lines = [pyStrip(line.slice(2))];
      entries.push(decision);
      decisions.push(decision);
      continue;
    }
    let m = REQ_HDR.exec(line);
    if (m) {
      const rid = m[1];
      const title = pyStrip(m[2]!);
      if (!rid) {
        problems.push([rpath, i, "missing-id", title]);
        curReq = null;
        curEntry = null;
        continue;
      }
      curReq = rid;
      let st: Status = status;
      if (status === "active" && change !== "main") {
        // REQ-IDX-003 a MODIFIED block in an active change is the pending version of a main-spec ID
        if (section === "MODIFIED") st = "modified";
        else if (section === "REMOVED") st = "removed";
      }
      curEntry = entry({ id: rid, kind: "req", file: rpath, line: i, title, change, status: st, refs: [], scenarios: [] });
      entries.push(curEntry);
      blocks.push(curEntry);
      continue;
    }
    m = SCN_HDR.exec(line);
    if (m) {
      const sid = m[1];
      const title = pyStrip(m[2]!);
      if (!sid) {
        problems.push([rpath, i, "missing-id", title]);
        continue;
      }
      const st = curEntry ? curEntry.status : status;
      const e = entry({ id: sid, kind: "scn", file: rpath, line: i, title, change, status: st, refs: [] });
      if (curReq && sid.startsWith("SCN-" + curReq.slice(4))) {
        curEntry!.scenarios!.push(sid);
        e.refs.push(curReq);
      } else if (curReq) {
        problems.push([rpath, i, "scenario-id-mismatch", `${sid} under ${curReq}`]);
      }
      entries.push(e);
      blocks.push(e);
      continue;
    }
    m = ADR_HDR.exec(line);
    if (m && i <= 3) {
      curEntry = entry({ id: m[1]!, kind: "adr", file: rpath, line: i, title: pyStrip(m[2]!), change: "main", status: "active", refs: [] });
      entries.push(curEntry);
      blocks.push(curEntry);
      continue;
    }
    m = REFS_RE.exec(pyStrip(line));
    if (m && curEntry !== null) {
      for (const ref of pyStrip(m[1]!).split(COMMA)) {
        if (ID_FULL.test(ref)) curEntry.refs.push(ref);
        else problems.push([rpath, i, "bad-ref", ref]);
      }
      continue;
    }
    m = sc.taskRe.exec(line);
    if (m && isTasks) {
      const box = m[1]!;
      const num = m[2]!;
      const body = m[m.length - 1]!;
      const tid = `${changeNum(change)}/${num}`;
      const reqs: string[] = [];
      for (const g of body.matchAll(TASK_REQ)) reqs.push(...g[1]!.split(COMMA));
      if (reqs.length === 0) problems.push([rpath, i, "task-without-req", tid]);
      if (!body.includes("Verify:")) problems.push([rpath, i, "task-without-verify", tid]);
      // the full task body is the title, so query output shows the Verify clause
      entries.push(entry({
        id: tid, kind: "task", file: rpath, line: i, title: pyStrip(body), change,
        status: pyStrip(box).toLowerCase() === "x" ? "done" : "open", refs: reqs,
      }));
    }
  }
  // REQ-IDX-002 text holds the lower-cased body of each block
  for (const e of blocks) {
    // text is empty for adr and task entries
    if (e.kind === "adr") continue;
    const [s, end] = blockRange(lines, e.line - 1);
    e.text = squash(lines.slice(s + 1, end));
  }
  for (const e of decisions) {
    const body = e._lines!.join(" ");
    delete e._lines;
    e.title = body.split(SENTENCE_END)[0]!;
    e.text = squash([body]);
    if (body.includes("Refs:")) {
      const after = body.slice(body.indexOf("Refs:") + 5);
      e.refs = [...after.matchAll(ID_RE)].map((x) => x[1]!);
    }
  }
}

export function isTestPath(sc: Scanner, rpath: string): boolean {
  const name = rpath.slice(rpath.lastIndexOf("/") + 1);
  return anyMatch(sc.tests, rpath) || rpath.includes("/tests/") || rpath.startsWith("tests/")
    || rpath.includes(".test.") || name.includes("test_");
}

export function scanSource(sc: Scanner, rpath: string, entries: Entry[], scnNamed: Set<string>): void {
  const isTest = isTestPath(sc, rpath);
  let content: string;
  try {
    content = readText(join(sc.root, rpath));
  } catch {
    return;
  }
  // REQ-CHK-002 a scenario is tested when a test file names it
  if (isTest) for (const m of content.matchAll(SCN_RE)) scnNamed.add(m[0]);
  const lines = splitLines(content);
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n]!;
    const i = n + 1;
    if (isTest) {
      const m = COVER_TAG.exec(line);
      if (m) {
        for (const rid of m[1]!.split(COMMA)) {
          entries.push(entry({ id: `${rpath}:${i}`, kind: "test", file: rpath, line: i, title: pyStrip(line), change: "main", status: "active", refs: [rid] }));
        }
        continue;
      }
    }
    const m = CODE_TAG.exec(line);
    if (m && !line.includes("Covers:")) {
      entries.push(entry({ id: `${rpath}:${i}`, kind: "code", file: rpath, line: i, title: pyStrip(line), change: "main", status: "active", refs: [m[1]!] }));
    }
  }
}
