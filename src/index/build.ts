// REQ-IDX-001 REQ-IDX-002 REQ-IDX-004 build, write, and load .ctx/index.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Config } from "../config.ts";
import { dumps } from "../util/json.ts";
import { cmpStr, cmpTuple } from "../util/pystr.ts";
import { markCanonical } from "./canonical.ts";
import { scanMarkdown, scannedOf, scanner, scanSource, walk, type ScanFile, type Scanner } from "./scan.ts";
import type { Entry, Index, Problem } from "./types.ts";

export const INDEX_PATH = ".ctx/index.json";

export function buildIndex(root: string, cfg: Config, files?: ScanFile[], sc?: Scanner): Index {
  const s = sc ?? scanner(root, cfg);
  const list = files ?? walk(s);
  const entries: Entry[] = [];
  const problems: Problem[] = [];
  const scnNamed = new Set<string>();
  for (const f of list) {
    if (f.kind === "md") scanMarkdown(s, f.path, entries, problems);
    else scanSource(s, f.path, entries, scnNamed);
  }
  markCanonical(entries);
  entries.sort((a, b) => cmpTuple([a.id, a.file, a.line], [b.id, b.file, b.line]));
  const uniq = new Map<string, Problem>();
  for (const p of problems) uniq.set(JSON.stringify(p), p);
  const probs = [...uniq.values()].sort((a, b) => cmpTuple(a, b));
  const data: Index = {
    entries,
    problems: probs,
    scanned: scannedOf(root, list),
    scn_named: [...scnNamed].sort(cmpStr),
  };
  mkdirSync(join(root, ".ctx"), { recursive: true });
  writeFileSync(join(root, INDEX_PATH), dumps(data) + "\n");
  return data;
}

export interface Loaded {
  data: Index;
  rebuilt: boolean;
}

/** REQ-IDX-004 compare the stored scan record with a fresh stat walk. Rebuild on a mismatch. */
export function loadIndex(root: string, cfg: Config): Loaded {
  const sc = scanner(root, cfg);
  const files = walk(sc);
  const p = join(root, INDEX_PATH);
  let data: Index | null = null;
  if (existsSync(p)) {
    try {
      data = JSON.parse(readFileSync(p, "utf8")) as Index;
    } catch {
      data = null;
    }
  }
  const fresh = scannedOf(root, files);
  if (data === null || !data.scanned || data.scanned.count !== fresh.count
    || data.scanned.newest_mtime_ms !== fresh.newest_mtime_ms || Object.keys(data.scanned).length !== 2) {
    return { data: buildIndex(root, cfg, files, sc), rebuilt: true };
  }
  return { data, rebuilt: false };
}
