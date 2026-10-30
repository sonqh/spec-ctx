// REQ-IDX-010 REQ-IDX-012 REQ-IDX-013 change entries, capability entries, and the design links of tasks.
import { cmpStr } from "../util/pystr.ts";
import { changeKey, changeOf, resolveChange, taskPaths, type ScanFile } from "./scan.ts";
import type { Entry } from "./types.ts";

const CHANGE_DIR = /^(openspec\/changes\/(?:archive\/)?[^/]+)\//;
const ARCHIVE_DATE = /^openspec\/changes\/archive\/(\d{4}-\d{2}-\d{2})-/;
const CAP_SPEC = /(?:^|\/)specs\/([^/]+)\/spec\.md$/;
// REQ-IDX-012 a full name `<key>/D<n>` or a bare `D<n>`. A bare D follows no letter, digit, slash, or hyphen.
const FULL_DESIGN = /(?<![\w/-])([\w-]+)\/D(\d+)(?!\w)/g;
const BARE_DESIGN = /(?<![\w/-])D(\d+)(?!\w)/g;

interface Folder {
  dir: string;
  change: string;
  archived: boolean;
  date: string;
  files: string[];
}

function entryOf(e: Pick<Entry, "id" | "kind" | "file" | "title" | "change" | "status">): Entry {
  return { ...e, line: 1, text: "", canonical: true, refs: [] };
}

/** REQ-IDX-013 the winner among folders with one key: active first, then the smaller name. Archived: newest date, then the smaller name. */
function better(a: Folder, b: Folder): boolean {
  if (a.archived !== b.archived) return !a.archived;
  if (a.archived && a.date !== b.date) return a.date > b.date;
  return cmpStr(a.change, b.change) < 0;
}

/** REQ-IDX-010 one change entry per key and one cap entry per capability name. */
function structureEntries(files: ScanFile[]): Entry[] {
  const folders = new Map<string, Folder>();
  const caps = new Map<string, string[]>();
  for (const f of files) {
    const m = CHANGE_DIR.exec(f.path);
    if (m) {
      let fo = folders.get(m[1]!);
      if (!fo) {
        const date = ARCHIVE_DATE.exec(f.path)?.[1] ?? "";
        folders.set(m[1]!, (fo = { dir: m[1]!, change: changeOf(f.path), archived: f.path.includes("/archive/"), date, files: [] }));
      }
      fo.files.push(f.path);
    }
    const c = CAP_SPEC.exec(f.path);
    if (c) {
      let l = caps.get(c[1]!);
      if (!l) caps.set(c[1]!, (l = []));
      l.push(f.path);
    }
  }
  const win = new Map<string, Folder>();
  for (const fo of folders.values()) {
    const key = changeKey(fo.change);
    const cur = win.get(key);
    if (!cur || better(fo, cur)) win.set(key, fo);
  }
  const out: Entry[] = [];
  for (const [key, fo] of win) {
    const proposal = `${fo.dir}/proposal.md`;
    const file = fo.files.includes(proposal) ? proposal : [...fo.files].sort(cmpStr)[0]!;
    out.push(entryOf({ id: `change/${key}`, kind: "change", file, title: fo.change, change: fo.change, status: fo.archived ? "archived" : "active" }));
  }
  for (const [name, list] of caps) {
    // the main spec, else the first active delta, else the newest archived delta
    const sorted = [...list].sort(cmpStr);
    const file = sorted.find((p) => p.startsWith("openspec/specs/"))
      ?? sorted.find((p) => !p.includes("/archive/"))
      ?? sorted[sorted.length - 1]!;
    out.push(entryOf({ id: `cap/${name}`, kind: "cap", file, title: name, change: "main", status: "active" }));
  }
  return out;
}

/** REQ-IDX-012 the `design:` links of a task. The scan reads the text before `Verify:` with the path spans removed. */
function designLinks(entries: Entry[]): void {
  const decisions = new Set(entries.filter((e) => e.kind === "decision").map((e) => e.id));
  for (const t of entries) {
    if (t.kind !== "task") continue;
    let body = t.title;
    const v = body.indexOf("Verify:");
    if (v >= 0) body = body.slice(0, v);
    for (const p of taskPaths(body)) body = body.split("`" + p + "`").join(" ");
    const found = new Set<string>();
    for (const m of body.matchAll(FULL_DESIGN)) {
      const folder = resolveChange(entries, m[1]!);
      const id = `${folder === undefined ? m[1]! : changeKey(folder)}/D${m[2]!}`;
      if (decisions.has(id)) found.add(id);
    }
    const own = `${changeKey(t.change)}/D`;
    for (const m of body.matchAll(BARE_DESIGN)) if (decisions.has(own + m[1]!)) found.add(own + m[1]!);
    if (found.size) t.links = [...found].sort(cmpStr).map((id) => `design:${id}`);
  }
}

/** Add the structural entries and the design links. It runs after the scan and before the canonical mark. */
export function addStructure(entries: Entry[], files: ScanFile[]): void {
  designLinks(entries);
  entries.push(...structureEntries(files));
}
