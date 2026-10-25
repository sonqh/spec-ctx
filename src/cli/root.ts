// REQ-CLI-001 root discovery: --root, else the nearest parent with spec-ctx.toml or openspec/.
// REQ-CLI-007 a root without openspec/ is no OpenSpec project. The command stops before it writes.
import { existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { UsageExit } from "./errors.ts";

/** REQ-CLI-007 exit 2 with the fixed message when the root has no openspec/ folder. */
export function requireOpenSpec(root: string): void {
  const os = join(root, "openspec");
  if (existsSync(os) && statSync(os).isDirectory()) return;
  throw new UsageExit(`not an OpenSpec project (no openspec/ under ${root}). Run npx -y @fission-ai/openspec@latest init first.`);
}

export function findRoot(cwd: string, explicit?: string): string {
  if (explicit !== undefined) {
    const r = resolve(cwd, explicit);
    if (!existsSync(r) || !statSync(r).isDirectory()) throw new UsageExit(`the root ${explicit} is not a directory`);
    return r;
  }
  let dir = resolve(cwd);
  for (;;) {
    if (existsSync(join(dir, "spec-ctx.toml"))) return dir;
    const os = join(dir, "openspec");
    if (existsSync(os) && statSync(os).isDirectory()) return dir;
    const up = dirname(dir);
    if (up === dir) return resolve(cwd);
    dir = up;
  }
}
