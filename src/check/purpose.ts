// REQ-CHK-011 REQ-LOOP-019 Purpose rules. OpenSpec copies a `## Purpose` of a delta into a new main spec at archive (067/D1).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Finding } from "./check.ts";

const PLACEHOLDER = /^(TBD|TODO)\b/i;

/** The line of `## Purpose` and the text under it, or null when the file has no such section. */
export function purposeOf(text: string): { line: number; body: string } | null {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => /^##\s+Purpose\s*$/.test(l));
  if (at < 0) return null;
  const rest = lines.slice(at + 1);
  const end = rest.findIndex((l) => /^##\s/.test(l));
  const body = (end < 0 ? rest : rest.slice(0, end)).join("\n").trim();
  return { line: at + 1, body };
}

const dirs = (abs: string): string[] => (existsSync(abs) ? readdirSync(abs).filter((n) => statSync(join(abs, n)).isDirectory()).sort() : []);

/** `delta-without-purpose <cap>`: a delta of an active change for a capability with no main spec and no Purpose text. */
export function deltaPurposeFindings(root: string, change?: string): Finding[] {
  const out: Finding[] = [];
  const base = join(root, "openspec/changes");
  for (const c of dirs(base)) {
    if (c === "archive" || (change !== undefined && c !== change)) continue;
    for (const cap of dirs(join(base, c, "specs"))) {
      const rel = `openspec/changes/${c}/specs/${cap}/spec.md`;
      if (!existsSync(join(root, rel)) || existsSync(join(root, "openspec/specs", cap, "spec.md"))) continue;
      const p = purposeOf(readFileSync(join(root, rel), "utf8"));
      if (!p || !p.body) out.push({ file: rel, line: p?.line ?? 1, rule: "delta-without-purpose", id: cap });
    }
  }
  return out;
}

/** `placeholder-purpose <cap> <file>:<line>`: a main spec whose Purpose is empty or starts with TBD or TODO. A warning in both modes. */
export function placeholderPurposeWarnings(root: string): string[] {
  const out: string[] = [];
  for (const cap of dirs(join(root, "openspec/specs"))) {
    const rel = `openspec/specs/${cap}/spec.md`;
    if (!existsSync(join(root, rel))) continue;
    const p = purposeOf(readFileSync(join(root, rel), "utf8"));
    if (p && (!p.body || PLACEHOLDER.test(p.body))) out.push(`placeholder-purpose ${cap} ${rel}:${p.line}`);
  }
  return out;
}
