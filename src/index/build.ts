// REQ-IDX-001 REQ-IDX-002 REQ-IDX-004 REQ-IDX-014 build, write, and load .ctx/index.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fsNowMs, mtimeMsOf, pause, setMtimeMs } from "./clock.ts";
import { join } from "node:path";
import type { Config } from "../config.ts";
import { dumps } from "../util/json.ts";
import { cmpStr, cmpTuple } from "../util/pystr.ts";
import { markCanonical } from "./canonical.ts";
import { addStructure } from "./structure.ts";
import { scanMarkdown, scannedOf, scanner, scanSource, walk, type ScanFile, type Scanner } from "./scan.ts";
import type { Entry, Index, Problem } from "./types.ts";

export const INDEX_PATH = ".ctx/index.json";
/** REQ-IDX-014 the most that a file mtime may pass the clock reading of a build and still count as a write in its tick. */
const TICK_MS = 50;
/** REQ-IDX-014 the most waits of 2 ms for the file clock to pass the newest mtime: 100 ms in all. */
const MAX_PAUSES = 50;

/**
 * REQ-IDX-004 build and write the index. `t0` is the clock reading taken before the walk of `files`. The index file gets
 * `t0` as its mtime, so a write in the same tick as the build, or during it, leaves a file at or after that mtime (049/D2).
 * A newest file 0 to 50 ms after `t0` makes the build wait until the file clock passes it, then take `t0` again (049/D4).
 * A file far after `t0`, such as one dated in the future, gets no wait. Only file clock readings enter this logic.
 */
export function buildIndex(root: string, cfg: Config, files?: ScanFile[], sc?: Scanner, t0?: number): Index {
  const s = sc ?? scanner(root, cfg);
  let at = t0 ?? fsNowMs(root);
  const list = files ?? walk(s);
  const newest = scannedOf(root, list).newest_mtime_ms;
  if (newest >= at && newest - at <= TICK_MS) {
    for (let i = 0; i < MAX_PAUSES; i++) {
      at = fsNowMs(root);
      if (at > newest) break;
      pause(2);
    }
  }
  return buildOnce(root, cfg, list, s, at);
}

function buildOnce(root: string, cfg: Config, list: ScanFile[], s: Scanner, t0: number): Index {
  const entries: Entry[] = [];
  const problems: Problem[] = [];
  const scnNamed = new Set<string>();
  for (const f of list) {
    if (f.kind === "md") scanMarkdown(s, f.path, entries, problems);
    else scanSource(s, f.path, entries, scnNamed);
  }
  addStructure(entries, list);
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
  setMtimeMs(join(root, INDEX_PATH), t0);
  return data;
}

export interface Loaded {
  data: Index;
  rebuilt: boolean;
}

/** REQ-IDX-004 compare the stored scan record with a fresh stat walk. Rebuild on a mismatch. */
export function loadIndex(root: string, cfg: Config): Loaded {
  const t0 = fsNowMs(root);
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
    || data.scanned.newest_mtime_ms !== fresh.newest_mtime_ms || Object.keys(data.scanned).length !== 2
    || fresh.newest_mtime_ms >= (mtimeMsOf(p) ?? 0)) {
    return { data: buildIndex(root, cfg, files, sc, t0), rebuilt: true };
  }
  return { data, rebuilt: false };
}
