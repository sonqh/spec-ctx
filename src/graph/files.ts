// REQ-QRY-006 the links of one file: code tags, Covers tags, and paths that active task lines name.
import { canon } from "../index/canonical.ts";
import type { Entry } from "../index/types.ts";
import { cmpStr } from "../util/pystr.ts";

/**
 * The direct links of a repository path as [ID, reason] pairs. The order is `implements`,
 * `covers`, `mentions`, then by ID. An ID keeps its first reason. Only canonical IDs count.
 */
export function fileEdges(entries: Entry[], path: string): [string, string][] {
  const ids = canon(entries);
  const groups: [string, string][][] = [[], [], []];
  const seen = new Set<string>();
  const push = (g: number, id: string, reason: string): void => {
    if (!ids.has(id) || seen.has(id)) return;
    seen.add(id);
    groups[g]!.push([id, reason]);
  };
  const tagged = entries
    .filter((e) => e.file === path && (e.kind === "code" || e.kind === "test"))
    .sort((a, b) => a.line - b.line);
  for (const e of tagged) {
    const g = e.kind === "code" ? 0 : 1;
    const verb = e.kind === "code" ? "implements" : "covers";
    for (const r of e.refs) push(g, r, `${verb}, tag at ${e.file}:${e.line}`);
  }
  const mentions = entries.filter((e) => e.kind === "task" && e.canonical && (e.paths ?? []).includes(path));
  for (const e of mentions) push(2, e.id, "mentions, in task line");
  return groups.flatMap((g) => g.sort((a, b) => cmpStr(a[0], b[0])));
}
