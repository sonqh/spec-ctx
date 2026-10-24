// REQ-CLI-004 specctx gate: check, both linters, openspec validate. Stops at the first failure.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Io } from "../main.ts";
import { anyMatch, globRe } from "../util/glob.ts";
import { cmpStr } from "../util/pystr.ts";

export const DEFAULT_MARKDOWN = "openspec/**/*.md decisions/*.md docs/**/*.md *.md";
const SKIP = new Set(["node_modules", ".git", ".ctx", "dist", "build"]);

/** The scripts/ folder of the package. It holds the two linters. */
export function lintDir(): string {
  return fileURLToPath(new URL("../../scripts/", import.meta.url));
}

export function markdownFiles(root: string, globs: string): string[] {
  const res = globs.split(/\s+/).filter(Boolean).map(globRe);
  const out: string[] = [];
  const walk = (abs: string, rel: string): void => {
    let names: string[];
    try {
      names = readdirSync(abs).sort(cmpStr);
    } catch {
      return;
    }
    for (const n of names) {
      const p = join(abs, n);
      const r = rel ? `${rel}/${n}` : n;
      let dir = false;
      try {
        dir = statSync(p).isDirectory();
      } catch {
        continue;
      }
      if (dir) {
        if (!SKIP.has(n)) walk(p, r);
      } else if (anyMatch(res, r)) out.push(r);
    }
  };
  walk(root, "");
  return out;
}

export interface GateOpts {
  strict: boolean;
  markdown: string;
  check: () => Promise<{ code: number; out: string }>;
}

export async function runGate(root: string, o: GateOpts, io: Io): Promise<number> {
  // gate 1: build and check
  const c = await o.check();
  if (c.code !== 0) {
    io.out("check: fail\n" + c.out);
    return 1;
  }
  io.out(`check: ok${o.strict ? " (strict)" : ""}\n`);

  // gate 2: the linters of the package on the markdown globs
  const py = spawnSync("python3", ["--version"], { encoding: "utf8" });
  const dir = lintDir();
  const tells = join(dir, "tells-lint.py");
  const ste = join(dir, "ste-lint.py");
  if (py.error || py.status !== 0) {
    io.out("linters: skipped, python3 not found\n");
  } else if (!existsSync(tells) || !existsSync(ste)) {
    io.out("linters: skipped, the linter scripts are not in this install\n");
  } else {
    const files = markdownFiles(root, o.markdown);
    const bad: string[] = [];
    for (const f of files) {
      for (const args of [[tells, "--baseline", "0", f], [ste, "--baseline", "0", "--disable", "synonym-rotation", f]]) {
        const r = spawnSync("python3", args, { cwd: root, encoding: "utf8" });
        if (r.status !== 0) bad.push(`${f}\n${r.stdout}${r.stderr}`);
      }
    }
    if (bad.length) {
      io.out("linters: fail\n" + bad.join(""));
      return 1;
    }
    io.out(`linters: ok (${files.length} file(s))\n`);
  }

  // gate 3: openspec validate. SPECCTX_OPENSPEC replaces the command, for tests and offline use.
  const cmd = process.env.SPECCTX_OPENSPEC ?? "npx -y @fission-ai/openspec@latest";
  const v = spawnSync("/bin/sh", ["-c", `${cmd} validate --all${o.strict ? " --strict" : ""} --no-interactive`], { cwd: root, encoding: "utf8" });
  if (v.status !== 0) {
    io.out("validate: fail\n" + (v.stdout ?? "") + (v.stderr ?? ""));
    return 1;
  }
  io.out(`validate: ok${o.strict ? " (strict)" : ""}\n`);
  return 0;
}
