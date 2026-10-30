// REQ-QRY-005 REQ-QRY-011 REQ-QRY-015 turn the inputs of bundle or context into IDs, changes, and paths (047/D2).
import { canon } from "../index/canonical.ts";
import type { Entry } from "../index/types.ts";
import { changeInput, resolveFileInput } from "./path.ts";

export interface Resolved {
  /** IDs, change IDs, and repository paths, in input order */
  wanted: string[];
  /** the members of `wanted` that are paths */
  paths: Set<string>;
  /** error lines for stderr. An empty list means every input resolved. */
  errors: string[];
  /** the first input that is a task ID, so the caller can find its entry */
  taskId?: string;
}

/** An ID wins over a change, and a change wins over a path (045/D1, 046/D8). */
export function resolveInputs(root: string, cwd: string, entries: Entry[], inputs: string[]): Resolved {
  const ids = canon(entries);
  const wanted: string[] = [];
  const paths = new Set<string>();
  const unknown: string[] = [];
  const errors: string[] = [];
  let taskId: string | undefined;
  for (const i of inputs) {
    if (ids.has(i)) {
      wanted.push(i);
      if (taskId === undefined && ids.get(i)!.kind === "task") taskId = i;
      continue;
    }
    const ch = changeInput(entries, i);
    if (ch) {
      wanted.push(ch);
      continue;
    }
    const r = resolveFileInput(root, cwd, i);
    if ("rel" in r) {
      wanted.push(r.rel);
      paths.add(r.rel);
    } else if (r.error.startsWith("unknown id ")) unknown.push(i);
    else errors.push(r.error);
  }
  if (unknown.length) errors.unshift(`unknown id(s): ${unknown.join(", ")}`);
  return { wanted, paths, errors, taskId };
}
