// REQ-ADOPT-008 the baseline against the merge base: new entries fail the gate (020/D2).
import { spawnSync } from "node:child_process";
import { parseLintLine } from "../lint/counts.ts";
import { cmpStr } from "../util/pystr.ts";
import { BASELINE_PATH } from "./baseline.ts";

/**
 * Lines of `current` that are new debt against `base`.
 * A line that the base lacks is new. A `lint <file> <rule> <count>` line with a count above
 * the base line of the same key is new, and reads `lint <file> <rule> <count> (base <n>)`.
 */
export function newEntries(current: readonly string[], base: readonly string[]): string[] {
  const baseSet = new Set(base);
  const baseLint = new Map<string, number>();
  for (const b of base) {
    const l = parseLintLine(b);
    if (l) baseLint.set(l.key, l.count);
  }
  const out: string[] = [];
  for (const c of current) {
    if (baseSet.has(c)) continue;
    const l = parseLintLine(c);
    if (l) {
      const n = baseLint.get(l.key);
      if (n === undefined) out.push(c);
      else if (l.count > n) out.push(`${c} (base ${n})`);
      continue;
    }
    out.push(c);
  }
  return [...new Set(out)].sort(cmpStr);
}

export type BaseResult = { lines: string[]; sha: string } | { skip: string };

function git(root: string, args: string[]): { ok: boolean; out: string } {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return { ok: r.status === 0, out: (r.stdout ?? "").trim() };
}

/** `.ctx/baseline.json` at `git merge-base HEAD <base>`, or the reason to skip the step. */
export function baseAtMergeBase(root: string, base: string): BaseResult {
  const inside = git(root, ["rev-parse", "--is-inside-work-tree"]);
  if (!inside.ok || inside.out !== "true") return { skip: "no git repository" };
  const mb = git(root, ["merge-base", "HEAD", base]);
  if (!mb.ok || !mb.out) return { skip: `no merge base with ${base}` };
  const sha = mb.out;
  const show = spawnSync("git", ["show", `${sha}:${BASELINE_PATH}`], { cwd: root, encoding: "utf8" });
  if (show.status !== 0) return { skip: `no ${BASELINE_PATH} at ${sha.slice(0, 7)}` };
  let v: unknown;
  try {
    v = JSON.parse(show.stdout);
  } catch {
    return { skip: `no ${BASELINE_PATH} at ${sha.slice(0, 7)}` };
  }
  if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) return { skip: `no ${BASELINE_PATH} at ${sha.slice(0, 7)}` };
  return { lines: v as string[], sha };
}

/** True when the subject starts with `baseline:`, the same pattern as REQ-GOV-007 for `release:`. */
export const isBaselineSubject = (subject: string): boolean => subject.trimStart().startsWith("baseline:");

/**
 * The subject of HEAD. On a merge commit, such as a pull request checkout in CI, the subject of the
 * second parent counts too, because that is the commit the author wrote (020/D4).
 */
export function headSubjects(root: string): string[] {
  const head = git(root, ["log", "-1", "--format=%s", "HEAD"]);
  if (!head.ok) return [];
  const out = [head.out];
  const parents = git(root, ["rev-list", "--parents", "-n", "1", "HEAD"]);
  if (parents.ok && parents.out.split(/\s+/).length > 2) {
    const second = git(root, ["log", "-1", "--format=%s", "HEAD^2"]);
    if (second.ok) out.push(second.out);
  }
  return out;
}
