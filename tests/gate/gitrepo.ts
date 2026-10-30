// Test helper: a git repo under a temp dir for the rerun tests. Nothing reaches the network or another repo.
import { spawnSync } from "node:child_process";
import { Project } from "../helpers.ts";

export function git(p: Project, ...args: string[]): string {
  const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", ...args], { cwd: p.root, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
}

/** An empty project with a git repo on branch main. */
export function gitProject(): Project {
  const p = new Project(null);
  git(p, "init", "-q", "-b", "main");
  return p;
}

export function commitAll(p: Project, msg: string): void {
  git(p, "add", "-A");
  git(p, "commit", "-q", "-m", msg);
}
