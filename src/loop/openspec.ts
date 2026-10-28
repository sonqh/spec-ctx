// REQ-LOOP-001 the one OpenSpec call of next: status --change <c> --json, two keys read (024/D3, ADR-006 item 2).
import { spawnSync } from "node:child_process";

export interface PlanningState {
  isPlanningComplete: boolean;
  nextStep: string | null;
}

export type StatusResult = { ok: true; state: PlanningState } | { ok: false; reason: string };

const TIMEOUT_MS = 60_000;

/** REQ-LOOP-001 the command that gate and next run for OpenSpec. The env var wins over [gate] openspec (018/D2). */
export function openspecCommand(configured: string): string {
  return process.env.SPECCTX_OPENSPEC ?? configured;
}

const firstLine = (text: string): string => text.split("\n").map((l) => l.trim()).find(Boolean) ?? "";

/** OpenSpec reports an error as JSON `{ status: [{ message }] }` on stdout. The first message is the reason. */
function errorMessage(stdout: string): string {
  try {
    const o = JSON.parse(stdout) as { status?: { message?: unknown }[] };
    const m = o.status?.find((s) => typeof s.message === "string")?.message;
    return typeof m === "string" ? firstLine(m) : "";
  } catch {
    return "";
  }
}

/** Run `<openspec> status --change <folder> --json` in the root. A failure of any kind is a reason, never a throw. */
export function openspecStatus(root: string, openspec: string, folder: string): StatusResult {
  const r = spawnSync("/bin/sh", ["-c", `${openspec} status --change ${folder} --json`], { cwd: root, encoding: "utf8", timeout: TIMEOUT_MS });
  if (r.error && (r.error as NodeJS.ErrnoException).code === "ETIMEDOUT") {
    return { ok: false, reason: `openspec status timed out after ${TIMEOUT_MS / 1000}s` };
  }
  const head = errorMessage(r.stdout ?? "") || firstLine(r.stderr ?? "") || firstLine(r.stdout ?? "") || "no output";
  if (r.status !== 0) return { ok: false, reason: `openspec status failed (exit ${r.status ?? "none"}): ${head}` };
  let raw: unknown;
  try {
    raw = JSON.parse(r.stdout);
  } catch {
    return { ok: false, reason: `openspec status printed no JSON: ${head}` };
  }
  if (raw === null || typeof raw !== "object") return { ok: false, reason: "openspec status printed no JSON object" };
  const o = raw as { isPlanningComplete?: unknown; nextSteps?: unknown };
  const steps = Array.isArray(o.nextSteps) ? o.nextSteps.filter((s): s is string => typeof s === "string") : [];
  return { ok: true, state: { isPlanningComplete: o.isPlanningComplete === true, nextStep: steps[0] ?? null } };
}
