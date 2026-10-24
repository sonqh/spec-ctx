// REQ-CLI-004 specctx gate: check, both linters, openspec validate, spec length. Stops at the first failure.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Io } from "../main.ts";
import { anyMatch, globRe } from "../util/glob.ts";
import { cmpStr } from "../util/pystr.ts";

export const DEFAULT_MARKDOWN = "openspec/**/*.md decisions/*.md docs/**/*.md *.md";
const SKIP = new Set(["node_modules", ".git", ".ctx", "dist", "build"]);

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

  // gate 2: REQ-LINT-003 both linters of this package on the markdown globs. No python3.
  const { lintSte } = await import("../lint/ste.ts");
  const { lintTells } = await import("../lint/tells.ts");
  const { steReport } = await import("../lint/cli.ts");
  const files = markdownFiles(root, o.markdown);
  const bad: string[] = [];
  const noRotation = new Set(["synonym-rotation"]);
  for (const f of files) {
    const text = readFileSync(join(root, f), "utf8").replace(/\r\n?/g, "\n");
    const tells = lintTells(text);
    const hard = tells.filter((x) => x.level === "hard");
    if (hard.length) bad.push(`${f}\n` + tells.map((x) => `${f}:${x.line}: [${x.level}] ${x.rule}: ${x.match}\n`).join("") + `${hard.length} hard finding(s), baseline 0\n`);
    const r = lintSte(text, f);
    const ste = r.findings.filter((x) => !noRotation.has(x.rule));
    const steHard = ste.filter((x) => x.level === "advisory-free").length;
    if (steHard) bad.push(`${f}\n` + steReport(ste, r.words, false, steHard, 0));
  }
  if (bad.length) {
    io.out("linters: fail\n" + bad.join(""));
    return 1;
  }
  io.out(`linters: ok (${files.length} file(s))\n`);

  // gate 3: openspec validate. SPECCTX_OPENSPEC replaces the command, for tests and offline use.
  const cmd = process.env.SPECCTX_OPENSPEC ?? "npx -y @fission-ai/openspec@latest";
  const v = spawnSync("/bin/sh", ["-c", `${cmd} validate --all${o.strict ? " --strict" : ""} --no-interactive`], { cwd: root, encoding: "utf8" });
  if (v.status !== 0) {
    io.out("validate: fail\n" + (v.stdout ?? "") + (v.stderr ?? ""));
    return 1;
  }
  io.out(`validate: ok${o.strict ? " (strict)" : ""}\n`);

  // gate 4: the length of every requirement in the deltas of active changes
  const long = longRequirements(root);
  if (long.length) {
    io.out(long.map((l) => `spec-length: fail ${l.id} ${l.chars} chars\n`).join(""));
    return 1;
  }
  io.out("spec-length: ok\n");
  return 0;
}

// REQ-CLI-005 the limit strict validate applies to a requirement after archive
export const MAX_REQUIREMENT_CHARS = 500;

/** Lines inside a fenced code block, fence lines included. Same rule as OpenSpec. */
function fenceMask(lines: string[]): boolean[] {
  const mask = new Array<boolean>(lines.length).fill(false);
  let open: { ch: string; len: number } | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!open) {
      const m = /^\s*(`{3,}|~{3,})/.exec(line);
      if (m) {
        open = { ch: m[1]![0]!, len: m[1]!.length };
        mask[i] = true;
      }
      continue;
    }
    mask[i] = true;
    const c = /^\s*(`{3,}|~{3,})\s*$/.exec(line);
    if (c && c[1]![0] === open.ch && c[1]!.length >= open.len) open = null;
  }
  return mask;
}

/**
 * The requirement text as OpenSpec counts it: the trimmed, non-blank lines after the header,
 * up to the first header line, joined with a newline. Metadata lines count only when nothing else is there.
 */
export function requirementText(body: string[]): string {
  const mask = fenceMask(body);
  const text: string[] = [];
  const meta: string[] = [];
  for (let i = 0; i < body.length; i++) {
    if (mask[i]) continue;
    if (/^#{1,6}\s/.test(body[i]!)) break;
    const t = body[i]!.trim();
    if (!t) continue;
    if (/^\*\*[^*]+\*\*:/.test(t)) meta.push(t);
    else text.push(t);
  }
  return (text.length ? text : meta).join("\n");
}

/** Every requirement over the limit in openspec/changes/<active>/specs/** /spec.md. */
export function longRequirements(root: string): { id: string; chars: number; file: string }[] {
  const out: { id: string; chars: number; file: string }[] = [];
  const changes = join(root, "openspec", "changes");
  if (!existsSync(changes)) return out;
  for (const c of readdirSync(changes).sort(cmpStr)) {
    if (c === "archive" || !statSync(join(changes, c)).isDirectory()) continue;
    for (const rel of markdownFiles(join(changes, c), "specs/**/spec.md")) {
      const lines = readFileSync(join(changes, c, rel), "utf8").split(/\r?\n/);
      const mask = fenceMask(lines);
      for (let i = 0; i < lines.length; i++) {
        const h = mask[i] ? null : /^###\s+Requirement:\s*(.*)$/.exec(lines[i]!);
        if (!h) continue;
        let end = i + 1;
        while (end < lines.length && (mask[end] || !/^#{1,3}\s/.test(lines[end]!))) end++;
        const chars = requirementText(lines.slice(i + 1, end)).length; // UTF-16 units, as OpenSpec counts
        if (chars > MAX_REQUIREMENT_CHARS) out.push({ id: h[1]!.trim().split(/\s+/)[0]!, chars, file: `openspec/changes/${c}/${rel}` });
      }
    }
  }
  return out;
}
