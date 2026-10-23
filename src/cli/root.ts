// REQ-CLI-001 root discovery: --root, else the nearest parent with spec-ctx.toml or openspec/.
import { existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { UsageExit } from "./errors.ts";

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
    if (up === dir) throw new UsageExit("no project root found. Run specctx in a folder that has spec-ctx.toml or openspec/");
    dir = up;
  }
}
