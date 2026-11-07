// REQ-IDX-015 the change folder of a path, from the fixed prefix of the `[scan] changes` globs (065/D1 to D3).
import { globBase, globRe } from "../util/glob.ts";

export interface ChangeRule {
  /** the literal path before the first wildcard, without a trailing slash */
  prefix: string;
  re: RegExp;
}
export type ChangeRules = ChangeRule[];

export interface ChangeFolder {
  /** the folder path, such as `openspec/changes/archive/2026-10-23-001-foundation` */
  dir: string;
  /** the change name, without the date prefix of an archived folder */
  name: string;
  archived: boolean;
  /** the `YYYY-MM-DD` of an archived folder, else the empty string */
  date: string;
}

const DATE = /^(\d{4}-\d{2}-\d{2})-/;

/** One rule for each glob, in list order. */
export function changeRules(globs: string[]): ChangeRules {
  return globs.map((g) => ({ prefix: globBase(g), re: globRe(g) }));
}

export const DEFAULT_RULES: ChangeRules = changeRules(["openspec/changes/**/*.md"]);

/**
 * The first glob in list order that matches the path and yields a folder wins. A glob with no prefix yields none.
 * A file directly under a prefix, or directly under its `archive/` folder, has no change folder.
 */
export function changeFolder(path: string, rules: ChangeRules = DEFAULT_RULES): ChangeFolder | undefined {
  for (const r of rules) {
    if (r.prefix === "" || !path.startsWith(r.prefix + "/") || !r.re.test(path)) continue;
    const rest = path.slice(r.prefix.length + 1).split("/");
    const archived = rest[0] === "archive";
    const at = archived ? 1 : 0;
    if (rest.length < at + 2) continue;
    const seg = rest[at]!;
    const dir = `${r.prefix}/${rest.slice(0, at + 1).join("/")}`;
    // openspec archive prefixes the folder with a date: 2026-10-23-001-foundation
    const date = archived ? (DATE.exec(seg)?.[1] ?? "") : "";
    return { dir, name: archived ? seg.replace(DATE, "") : seg, archived, date };
  }
  return undefined;
}
