// REQ-TASK-009 REQ-TASK-010 REQ-TASK-004 the files that evidence records: named, Verify, and diff files.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { childEnv, GIT_REPO_VARS } from "../util/env.ts";
import { fileSha256 } from "../util/hash.ts";
import { evidenceRel, type Task } from "./tasks.ts";

export interface Base {
  head: string;
  files: Record<string, string>;
}

export interface Cur {
  task?: string;
  base?: Base;
}

export interface TaskFiles {
  files: Record<string, string>;
  diff: string[];
  note: string | null;
}

interface Run {
  status: number | null;
  out: Buffer;
}

const EXCLUDE = ["--", ".", ":!.ctx", ":!.claude"];

/** One git command in the project root. The repo variables that a hook sets stay out, so the root decides the repo (066/D9). */
function git(root: string, args: string[], input?: string): Run | null {
  const env = childEnv();
  for (const k of GIT_REPO_VARS) delete env[k];
  const r = spawnSync("git", args, { cwd: root, env, input, maxBuffer: 256 * 1024 * 1024 });
  if (r.error) return null;
  return { status: r.status, out: r.stdout };
}

const zlist = (b: Buffer): string[] => b.toString("utf8").split("\0").filter(Boolean);

const isFile = (abs: string): boolean => {
  try {
    return statSync(abs).isFile();
  } catch {
    return false;
  }
};

/** 066/D5 the tasks.md of a change is edited after the evidence, so it never counts. */
const skipPath = (p: string): boolean => p === ".ctx" || p.startsWith(".ctx/") || p === ".claude" || p.startsWith(".claude/") || p.split("/").pop() === "tasks.md";

/** 066/D6 the paths that git ignores. Exit 1 means none. Any other failure means none are known. */
function ignored(root: string, paths: string[]): Set<string> {
  if (paths.length === 0) return new Set();
  const r = git(root, ["check-ignore", "-z", "--stdin"], paths.join("\0") + "\0");
  if (!r || r.status !== 0) return new Set();
  return new Set(zlist(r.out));
}

/** The existing regular files of a path list that no filter drops, sorted. */
function keep(root: string, paths: string[]): string[] {
  const cand = [...new Set(paths)].filter((p) => !skipPath(p) && isFile(join(root, p)));
  const ign = ignored(root, cand);
  return cand.filter((p) => !ign.has(p)).sort();
}

/** The changed and untracked paths since a head, or null when git fails (066/D4). */
function changedSince(root: string, head: string): string[] | null {
  const d = git(root, ["diff", "-z", "--name-only", "--relative", head, ...EXCLUDE]);
  if (!d || d.status !== 0) return null;
  const u = git(root, ["ls-files", "-z", "-o", "--exclude-standard", ...EXCLUDE]);
  if (!u || u.status !== 0) return null;
  return [...zlist(d.out), ...zlist(u.out)];
}

const digests = (root: string, paths: string[]): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const p of paths) {
    const d = fileSha256(join(root, p));
    if (d) out[p] = d;
  }
  return out;
};

/** REQ-TASK-009 the HEAD commit and the digest of each changed or untracked file, or null with no git or no commit. */
export function snapshotBase(root: string): Base | null {
  const h = git(root, ["rev-parse", "--verify", "-q", "HEAD"]);
  if (!h || h.status !== 0) return null;
  const head = h.out.toString("utf8").trim();
  const list = changedSince(root, head);
  if (!list) return null;
  return { head, files: digests(root, keep(root, list)) };
}

/** REQ-TASK-009 the files whose digest differs from the base or that the base lacks. Null means the base is lost. */
export function touchedSince(root: string, base: Base): string[] | null {
  const list = changedSince(root, base.head);
  if (!list) return null;
  const now = digests(root, keep(root, list));
  return Object.keys(now).filter((p) => base.files[p] !== now[p]).sort();
}

/** REQ-TASK-004 the existing files that a task line names. */
export function namedFiles(root: string, paths: string[]): string[] {
  return keep(root, paths.map((p) => p.replace(/^(\.\/)+/, "")).filter((p) => !isAbsolute(p) && !p.startsWith("../")));
}

/** REQ-TASK-004 the existing files that a Verify command names, inside the root (066/D3). */
export function verifyFiles(root: string, dir: string, command: string): string[] {
  const out: string[] = [];
  for (const raw of command.split(/\s+/)) {
    const t = raw.replace(/[;()<>"'`]/g, "").replace(/^[A-Za-z_][A-Za-z0-9_]*=/, "");
    if (!t || t.startsWith("-") || !(t.includes("/") || t.includes("."))) continue;
    if (isAbsolute(t) || t.startsWith("&")) continue;
    for (const base of [dir, root]) {
      const abs = resolve(base, t);
      const rel = relative(root, abs);
      if (rel.startsWith("..") || isAbsolute(rel)) break;
      if (isFile(abs)) {
        out.push(rel.split(sep).join("/"));
        break;
      }
    }
  }
  return keep(root, out);
}

/** REQ-TASK-010 the `diff` paths of the newest reopened copy, or none when it has no such field. */
function carried(root: string, t: { id: string }): string[] {
  const rel = evidenceRel(t).replace(/\.json$/, "");
  const dir = join(root, rel.slice(0, rel.lastIndexOf("/")));
  const stem = rel.slice(rel.lastIndexOf("/") + 1) + ".reopened-";
  if (!existsSync(dir)) return [];
  let best = 0;
  for (const n of readdirSync(dir)) {
    const m = n.startsWith(stem) ? /^(\d+)\.json$/.exec(n.slice(stem.length)) : null;
    if (m && Number(m[1]) > best) best = Number(m[1]);
  }
  if (!best) return [];
  try {
    const ev = JSON.parse(readFileSync(join(root, `${rel}.reopened-${best}.json`), "utf8")) as { diff?: unknown };
    return Array.isArray(ev.diff) ? keep(root, ev.diff.filter((x): x is string => typeof x === "string")) : [];
  } catch {
    return [];
  }
}

/** REQ-TASK-004 REQ-TASK-009 REQ-TASK-010 the `files` and `diff` of the evidence of a task, and the note for a missing base. */
export function taskFiles(root: string, t: Pick<Task, "id" | "entry" | "verify">, dir: string, cur: Cur | null): TaskFiles {
  let diff: string[] = [];
  let cause: string | null = null;
  if (cur?.task === t.id && cur.base) {
    const d = touchedSince(root, cur.base);
    if (d) diff = d;
    else cause = "base lost";
  } else {
    const h = git(root, ["rev-parse", "--verify", "-q", "HEAD"]);
    cause = !h || h.status !== 0 ? "no git repo" : "no task start";
  }
  let carry: string[] = [];
  if (cause) {
    carry = carried(root, t);
    diff = carry;
  }
  const paths = [...namedFiles(root, t.entry.paths ?? []), ...(t.verify.command ? verifyFiles(root, dir, t.verify.command) : []), ...diff];
  const files = digests(root, [...new Set(paths)].sort());
  const note = cause
    ? `note: no diff base for ${t.id} (${cause}). Evidence files hold the ${carry.length ? "named, Verify, and carried diff" : "named and Verify"} files only.`
    : null;
  return { files, diff: [...new Set(diff)].sort(), note };
}
