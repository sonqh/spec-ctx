import { confirm, isCancel } from "@clack/prompts";
import {
  driftStatus,
  executePlan,
  itemDiff,
  makePlan,
  revert,
  type Env,
  type Plan,
  type PlanItem,
} from "../apply/pipeline.ts";
import { listSets, readManifest } from "../apply/backup.ts";
import { lockPath } from "../apply/lockfile.ts";
import { agentrcHome } from "../profile/load.ts";
import { formatIssues } from "../profile/validate.ts";
import { EXIT } from "../util/errors.ts";
import type { Io } from "./io.ts";
import type { Flags } from "./main.ts";

/** Hooks that later changes plug in: the catalog resolver (004). */
export const extensions: { catalog?: Env["catalog"] } = {};

export function envFor(io: Io, f: Flags, extra: Partial<Env> = {}): Env {
  return {
    home: io.home,
    env: io.env,
    profileFlag: f.profile,
    agents: f.agents,
    catalog: extensions.catalog,
    ...extra,
  };
}

// REQ-CLI-008 added and removed line counts of an update, from its unified diff
export function lineCounts(it: PlanItem): { added: number; removed: number } | null {
  if (it.action !== "update") return null;
  const d = itemDiff(it);
  if (!d.includes("\n@@")) return null;
  let added = 0;
  let removed = 0;
  for (const l of d.split("\n")) {
    if (l.startsWith("+++") || l.startsWith("---")) continue;
    if (l.startsWith("+")) added++;
    else if (l.startsWith("-")) removed++;
  }
  return { added, removed };
}

// REQ-CLI-004 one line per item, no color, no emoji. REQ-CLI-008 an update shows +N -M.
export function itemLine(it: PlanItem): string {
  const c = lineCounts(it);
  const counts = c ? `  +${c.added} -${c.removed}` : "";
  const note = it.note ? `  (${it.note})` : "";
  return `${it.action.padEnd(9)} ${it.agent.padEnd(11)} ${it.path}${counts}${note}`;
}

export function planJson(plan: Plan, extra: Record<string, unknown> = {}): string {
  return (
    JSON.stringify(
      {
        profile: plan.loaded.path,
        profile_digest: plan.loaded.digest,
        agents: plan.agents.map((a) => ({ id: a.id, installed: a.installed, supported: a.supported, config_dir: a.configDir, notice: a.notice ?? null })),
        artifacts: plan.items.map((i) => ({ agent: i.agent, path: i.path, action: i.action, write: i.write, note: i.note ?? null, lines: lineCounts(i) })),
        // REQ-CLI-009 JSON keeps every degradation
        degradations: plan.ic.degradations,
        warnings: plan.warnings.map((w) => ({ path: w.path, message: w.message })),
        ...extra,
      },
      null,
      2,
    ) + "\n"
  );
}

/** Agents with at least one create, update, or remove. */
export function writtenAgents(plan: Plan): Set<string> {
  return new Set(plan.items.filter((i) => i.action === "create" || i.action === "update" || i.action === "remove").map((i) => i.agent));
}

export function counts(plan: Plan): string {
  const c: Record<string, number> = {};
  for (const i of plan.items) c[i.action] = (c[i.action] ?? 0) + 1;
  return ["create", "update", "remove", "unchanged", "skip"].filter((k) => c[k]).map((k) => `${c[k]} ${k}`).join(", ");
}

// REQ-CLI-008 one summary line per artifact, then one totals line. The unified diff only with --diff.
export function printPlan(io: Io, plan: Plan, f: { diff: boolean; verbose: boolean }): void {
  if (plan.warnings.length) io.err(formatIssues(plan.warnings, "warning") + "\n");
  // REQ-ELIC-010 one notice per agent per run, on stderr
  const notices = new Set<string>();
  for (const a of plan.agents) if (a.notice) notices.add(`notice: ${a.notice}`);
  for (const n of notices) io.err(n + "\n");
  for (const it of plan.items) {
    if (it.note && !it.artifact && !f.verbose && it.action === "skip") {
      io.out(`${it.action.padEnd(9)} ${it.agent.padEnd(11)} -\n`);
      continue;
    }
    io.out(itemLine({ ...it, note: f.verbose ? it.note : undefined }) + "\n");
  }
  io.out(`plan: ${counts(plan) || "nothing to do"}\n`);
  // REQ-CLI-009 degradations only for agents that get a file written
  const written = writtenAgents(plan);
  for (const d of plan.ic.degradations) {
    if (written.has(d.agent)) io.err(`degraded: ${d.agent} ${d.requirement}: ${d.reason}\n`);
  }
  if (f.diff) {
    for (const it of plan.items) {
      const d = itemDiff(it);
      if (d) io.out("\n" + d);
    }
  }
}

// REQ-APPLY-001
export function runPlan(io: Io, f: Flags): number {
  const plan = makePlan(envFor(io, f));
  if (f.json) {
    io.out(planJson(plan, f.diff ? { diffs: Object.fromEntries(plan.items.map((i) => [i.path, itemDiff(i)]).filter(([, d]) => d)) } : {}));
    return EXIT.ok;
  }
  printPlan(io, plan, f);
  return EXIT.ok;
}

export type Confirm = (message: string) => Promise<boolean>;

export const clackConfirm: Confirm = async (message) => {
  const r = await confirm({ message });
  return !isCancel(r) && r === true;
};

export interface ApplyDone {
  written: string[];
  backup: string | null;
}

export interface ApplyHooks {
  /** false: the caller prints its own outro. init does. */
  outro?: boolean;
  done?: (d: ApplyDone) => void;
}

// REQ-APPLY-004 print the plan, ask, write. --yes skips the question. No TTY and no --yes exits 3.
export async function runApply(io: Io, f: Flags, ask: Confirm = clackConfirm, extra: Partial<Env> = {}, hooks: ApplyHooks = {}): Promise<number> {
  const env = envFor(io, f, extra);
  const plan = makePlan(env);
  const changes = plan.items.filter((i) => i.action !== "unchanged" && i.action !== "skip");
  if (f.json) {
    if (!f.yes) {
      io.out(planJson(plan, { applied: false, reason: "confirmation needed. Run again with --yes." }));
      return EXIT.confirm;
    }
  } else {
    printPlan(io, plan, { diff: f.diff, verbose: f.verbose });
  }
  if (!f.yes && changes.length) {
    if (!io.isTTY) {
      io.err("confirmation needed. Run again with --yes. Nothing was written.\n");
      return EXIT.confirm;
    }
    const ok = await ask(`Apply ${changes.length} change(s)?`);
    if (!ok) {
      io.err("cancelled. Nothing was written.\n");
      return EXIT.confirm;
    }
  }
  const res = executePlan(plan, env, io.now());
  if (res.failed) {
    // SCN-APPLY-008-1
    const msg = `write failed: ${res.failed.path}: ${res.error?.message ?? "unknown error"}`;
    const not = res.notWritten.map((i) => i.path);
    if (f.json) {
      io.out(JSON.stringify({ applied: false, error: msg, written: res.written.map((i) => i.path), not_written: not, backup: res.backup }, null, 2) + "\n");
    } else {
      io.err(`${msg}\n`);
      for (const p of not) io.err(`not written: ${p}\n`);
      io.err("the lockfile was not written. Run agentrc revert to restore the files that changed.\n");
    }
    return EXIT.writeFailure;
  }
  const written = res.written.map((i) => i.path);
  hooks.done?.({ written, backup: res.backup });
  if (f.json) {
    // REQ-APPLY-010 the outro as fields
    io.out(planJson(plan, { applied: true, backup: res.backup, written, count: written.length, check: "agentrc status", undo: "agentrc revert" }));
  } else if (hooks.outro !== false) {
    io.out(applyOutro(written.length, res.backup));
  }
  return EXIT.ok;
}

// REQ-APPLY-010 count, backup set, and the two follow-up commands
export function applyOutro(count: number, backup: string | null): string {
  return `applied: ${count} file(s) written${backup ? `, backup ${backup}` : ""}\nCheck: agentrc status\nUndo: agentrc revert\n`;
}

// REQ-APPLY-005 status compares the lockfile with disk. Drift exits 1.
export function runStatus(io: Io, f: Flags): number {
  const home = agentrcHome({ env: io.env, home: io.home });
  const { lock, items } = driftStatus(home);
  if (!lock) {
    if (f.json) io.out(JSON.stringify({ lockfile: null, artifacts: [] }) + "\n");
    // REQ-CLI-007
    else io.err(`no lockfile at ${lockPath(home)}\nRun: agentrc init\n`);
    return EXIT.drift;
  }
  const filtered = f.agents?.length ? items.filter((i) => f.agents!.includes(i.agent)) : items;
  const bad = filtered.filter((i) => i.state !== "ok");
  if (f.json) {
    io.out(JSON.stringify({ lockfile: home, profile_digest: lock.profile_digest, artifacts: filtered }, null, 2) + "\n");
  } else {
    for (const i of filtered) io.out(`${i.state.padEnd(9)} ${i.agent.padEnd(11)} ${i.path}\n`);
    io.out(bad.length ? `status: ${bad.length} artifact(s) drifted or missing\n` : "status: all artifacts match the lockfile\n");
  }
  return bad.length ? EXIT.drift : EXIT.ok;
}

// REQ-APPLY-007 the line after a revert: what status will say now, and why
export function revertFollowUp(agentrcHomeDir: string): { line: string; drifted: string[] } {
  const { lock, items } = driftStatus(agentrcHomeDir);
  if (!lock) return { line: "status: no lockfile now, so status has nothing to compare. Run agentrc apply to write the files again.", drifted: [] };
  const drifted = items.filter((i) => i.state !== "ok").map((i) => i.path);
  if (!drifted.length) return { line: "status: no drift. The restored files match the restored lockfile.", drifted };
  return {
    line: `status: drift for ${drifted.join(", ")}, because the restored file differs from the restored lockfile. Run agentrc apply to re-sync.`,
    drifted,
  };
}

// REQ-APPLY-007 backup sets, newest first, with their file counts
export function backupList(agentrcHomeDir: string): { id: string; files: number }[] {
  const lock = lockPath(agentrcHomeDir);
  return listSets(agentrcHomeDir)
    .slice()
    .reverse()
    .map((id) => {
      const m = readManifest(agentrcHomeDir, id);
      const files = m ? [...m.modified, ...m.created].filter((p) => p !== lock).length : 0;
      return { id, files };
    });
}

// REQ-APPLY-007
export function runRevert(io: Io, f: Flags): number {
  const home = agentrcHome({ env: io.env, home: io.home });
  if (f.list) {
    const sets = backupList(home);
    if (f.json) io.out(JSON.stringify({ sets }, null, 2) + "\n");
    else if (!sets.length) io.out("no backup sets\n");
    else for (const s of sets) io.out(`${s.id}  ${s.files} file(s)\n`);
    return EXIT.ok;
  }
  const r = revert(home, io.home, f.to);
  const follow = revertFollowUp(home);
  if (f.json) {
    io.out(JSON.stringify({ ...r, status: follow.line, drifted: follow.drifted }, null, 2) + "\n");
  } else {
    for (const p of r.restored) io.out(`restored  ${p}\n`);
    for (const p of r.removed) io.out(`removed   ${p}\n`);
    io.out(`reverted: backup set ${r.id}\n`);
    io.out(follow.line + "\n");
  }
  return EXIT.ok;
}
