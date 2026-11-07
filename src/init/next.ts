// REQ-DIST-017 what init says to do next, from the state of the specs.
import { UsageExit } from "../cli/errors.ts";
import { loadConfigOrExit } from "../cli/config.ts";
import { ConfigError } from "../config.ts";
import { planAdopt } from "../adopt/plan.ts";
import { loadIndex } from "../index/build.ts";
import { nextTask } from "../tasks/tasks.ts";
import { runCommand } from "../runcmd.ts";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** true when .gitignore keeps .ctx/index.json out of git, or the index is already there */
function indexIsSafe(root: string): boolean {
  if (existsSync(join(root, ".ctx/index.json"))) return true;
  const g = join(root, ".gitignore");
  if (!existsSync(g)) return false;
  return readFileSync(g, "utf8").split("\n").map((l) => l.trim()).includes(".ctx/index.json");
}

export interface Detected {
  /** headers that need an ID, 0 when none */
  needs_id: number;
  /** the summary line, or null */
  summary: string | null;
  /** the next command, with the run prefix and without `next: ` */
  next: string;
}

/**
 * Read the specs with the adopt planner. The planner writes nothing. When no header needs an ID,
 * loadIndex may write .ctx/index.json, only when .gitignore already lists it or it exists (061/D1). Only a usage or config error gives
 * the status fallback. Any other throw propagates.
 */
export function detectNext(root: string, run: string): Detected {
  const status: Detected = { needs_id: 0, summary: null, next: runCommand(run, "status") };
  try {
    const cfg = loadConfigOrExit(root);
    const plan = planAdopt(root, cfg);
    if (plan.edits.length > 0) {
      const files = new Set(plan.edits.map((e) => e.file)).size;
      const caps = plan.caps.filter((c) => c.derived).length;
      return {
        needs_id: plan.edits.length,
        summary: `specs: ${plan.edits.length} headers in ${files} files need an ID (${caps} capability codes). adopt --dry-run shows each one.`,
        next: runCommand(run, "adopt"),
      };
    }
    // a skills refresh must not leave an untracked index behind (REQ-DIST-013)
    if (!indexIsSafe(root)) return status;
    const task = nextTask(root, loadIndex(root, cfg).data.entries);
    return task ? { ...status, next: runCommand(run, `context ${task.id}`) } : status;
  } catch (e) {
    if (e instanceof UsageExit || e instanceof ConfigError) return status;
    throw e;
  }
}
