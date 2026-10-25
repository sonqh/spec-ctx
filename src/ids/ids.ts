// REQ-IDS-001 REQ-IDS-002 REQ-IDS-003 ID allocation and retirement.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { UsageExit } from "../cli/errors.ts";
import type { Config } from "../config.ts";
import { canon } from "../index/canonical.ts";
import { changeKey, resolveChange } from "../index/scan.ts";
import type { Entry } from "../index/types.ts";
import { today } from "../util/time.ts";

export const RETIRED_FILE = "decisions/retired-ids.md";
const ANY_ID = /\b(REQ-[A-Z]{2,6}-\d{3}|SCN-[A-Z]{2,6}-\d{3}-\d+|ADR-\d{3})\b/g;

export function retiredAll(root: string): Set<string> {
  const p = join(root, RETIRED_FILE);
  if (!existsSync(p)) return new Set();
  // the retired ID is the first ID of a line. A reason may name a live replacement ID.
  const out = new Set<string>();
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = new RegExp(ANY_ID.source).exec(line);
    if (m) out.add(m[1]!);
  }
  return out;
}

const pad = (n: number, w = 3): string => String(n).padStart(w, "0");

export interface NewOpts {
  kind: string;
  cap?: string;
  forReq?: string;
  count: number;
}

/** Next unused IDs. Next is one more than the highest number among all index entries and retired IDs. */
export function newIds(root: string, cfg: Config, entries: Entry[], o: NewOpts): string[] {
  const kind = o.kind.toUpperCase();
  if (!Number.isInteger(o.count) || o.count < 1) throw new UsageExit("--count needs an integer of 1 or more");
  const known = [...entries.map((e) => e.id), ...retiredAll(root)];
  const next = (re: RegExp): number => {
    let max = 0;
    for (const id of known) {
      const m = re.exec(id);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return max + 1;
  };
  const checkCap = (cap: string | undefined): string => {
    if (!cap) throw new UsageExit(`id new ${kind} needs a capability code`);
    if (!/^[A-Z]{2,6}$/.test(cap)) throw new UsageExit(`the capability code ${cap} must be 2 to 6 upper case letters`);
    if (!cfg.ids.caps.includes(cap)) {
      throw new UsageExit(`unknown-cap ${cap}. Configured codes: ${cfg.ids.caps.join(", ") || "none"}`);
    }
    return cap;
  };
  const seq = (start: number, fmt: (n: number) => string): string[] =>
    Array.from({ length: o.count }, (_, i) => fmt(start + i));
  switch (kind) {
    case "REQ": {
      const cap = checkCap(o.cap);
      const start = next(new RegExp(`^REQ-${cap}-(\\d{3})$`));
      if (start + o.count - 1 > 999) throw new UsageExit(`no free REQ number for ${cap}`);
      return seq(start, (n) => `REQ-${cap}-${pad(n)}`);
    }
    case "SCN": {
      const cap = checkCap(o.cap);
      if (!o.forReq) throw new UsageExit("id new SCN needs --for <REQ-ID>");
      const m = /^REQ-([A-Z]{2,6})-(\d{3})$/.exec(o.forReq);
      if (!m || m[1] !== cap) throw new UsageExit(`--for ${o.forReq} is not a REQ ID of ${cap}`);
      const start = next(new RegExp(`^SCN-${cap}-${m[2]}-(\\d+)$`));
      return seq(start, (n) => `SCN-${cap}-${m[2]}-${n}`);
    }
    case "ADR": {
      const start = next(/^ADR-(\d{3})$/);
      if (start + o.count - 1 > 999) throw new UsageExit("no free ADR number");
      return seq(start, (n) => `ADR-${pad(n)}`);
    }
    case "DEC": {
      // REQ-IDX-005 a design decision ID is <change key>/D<n>. The CAP argument names the change by key or folder.
      if (!o.cap) throw new UsageExit("id new DEC needs a change name or key");
      const folder = resolveChange(entries, o.cap);
      if (folder === undefined) throw new UsageExit(`no change with the key ${changeKey(o.cap)}`);
      const num = changeKey(folder);
      const start = next(new RegExp(`^${num.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/D(\\d+)$`));
      return seq(start, (n) => `${num}/D${n}`);
    }
  }
  throw new UsageExit(`id new needs REQ, SCN, ADR, or DEC, not ${o.kind}`);
}

/** Append a row to decisions/retired-ids.md. A canonical ID is still in use and stays. */
export function retire(root: string, entries: Entry[], id: string, reason: string): string {
  if (!/^(REQ-[A-Z]{2,6}-\d{3}|SCN-[A-Z]{2,6}-\d{3}-\d+|ADR-\d{3})$/.test(id)) throw new UsageExit(`${id} is not a REQ, SCN, or ADR ID`);
  if (!reason.trim()) throw new UsageExit("id retire needs a reason");
  // an archived copy is history. Only a copy in openspec/specs/ or an active change keeps the ID in use.
  const live = canon(entries).get(id);
  if (live && live.status !== "archived") throw new UsageExit(`${id} is still in use at ${live.file}:${live.line}`);
  if (retiredAll(root).has(id)) throw new UsageExit(`${id} is already retired`);
  const p = join(root, RETIRED_FILE);
  let text = existsSync(p) ? readFileSync(p, "utf8") : "";
  if (!/^\| ID \| Date \| Reason \|$/m.test(text)) {
    if (!text.trim()) text = "# Retired IDs\n\nIDs that were removed. Never reuse them.\n";
    text = text.replace(/\n*$/, "\n\n") + "| ID | Date | Reason |\n| --- | --- | --- |\n";
  } else if (!text.endsWith("\n")) text += "\n";
  const row = `| ${id} | ${today()} | ${reason.trim().replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ")} |`;
  mkdirSync(join(root, "decisions"), { recursive: true });
  writeFileSync(p, text + row + "\n");
  rmSync(join(root, ".ctx/index.json"), { force: true });
  return row;
}
