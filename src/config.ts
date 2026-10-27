// REQ-DIST-002 spec-ctx.toml with defaults from REQ-IDX-001 and REQ-QRY-003.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "smol-toml";

export interface Config {
  scan: {
    specs: string[];
    changes: string[];
    decisions: string[];
    code: string[];
    tests: string[];
    ignore: string[];
  };
  ids: { caps: string[]; task_pattern: string; paths: Record<string, string> };
  bundle: { budget: number; depth: number };
  verify: { timeout_s: number };
  gate: { markdown: string[] };
}

export const CONFIG_FILE = "spec-ctx.toml";

export function defaults(): Config {
  return {
    scan: {
      specs: ["openspec/specs/**/*.md"],
      changes: ["openspec/changes/**/*.md"],
      decisions: ["decisions/*.md"],
      code: ["src/**"],
      tests: ["tests/**"],
      ignore: [],
    },
    ids: { caps: [], task_pattern: "\\d+\\.\\d+", paths: {} },
    bundle: { budget: 8000, depth: 1 },
    verify: { timeout_s: 600 },
    gate: { markdown: ["openspec/**/*.md", "decisions/*.md", "docs/**/*.md", "*.md"] },
  };
}

export class ConfigError extends Error {}

function strList(v: unknown, key: string): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v as string[];
  throw new ConfigError(`${CONFIG_FILE}: ${key} must be a string or a list of strings.`);
}

/** Read the config of a project root. A missing file gives all defaults. */
export function loadConfig(root: string): Config {
  const cfg = defaults();
  const p = join(root, CONFIG_FILE);
  if (!existsSync(p)) return cfg;
  let raw: Record<string, unknown>;
  try {
    raw = parse(readFileSync(p, "utf8")) as Record<string, unknown>;
  } catch (e) {
    throw new ConfigError(`${CONFIG_FILE}: the file is not valid TOML. ${(e as Error).message.split("\n")[0]}`);
  }
  const sec = (name: string): Record<string, unknown> => {
    const v = raw[name];
    return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  };
  const scan = sec("scan");
  for (const k of Object.keys(cfg.scan) as (keyof Config["scan"])[]) {
    if (k in scan) cfg.scan[k] = strList(scan[k], `scan.${k}`);
  }
  const ids = sec("ids");
  if ("caps" in ids) cfg.ids.caps = strList(ids.caps, "ids.caps");
  if ("task_pattern" in ids) {
    if (typeof ids.task_pattern !== "string") throw new ConfigError(`${CONFIG_FILE}: ids.task_pattern must be a string.`);
    cfg.ids.task_pattern = ids.task_pattern;
  }
  if ("paths" in ids) {
    const v = ids.paths;
    if (v === null || typeof v !== "object" || Array.isArray(v) || !Object.values(v).every((x) => typeof x === "string")) {
      throw new ConfigError(`${CONFIG_FILE}: ids.paths must be a table of code = "capability path".`);
    }
    cfg.ids.paths = { ...(v as Record<string, string>) };
  }
  const bundle = sec("bundle");
  for (const k of ["budget", "depth"] as const) {
    if (k in bundle) {
      const v = bundle[k];
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
        throw new ConfigError(`${CONFIG_FILE}: bundle.${k} must be an integer of 0 or more.`);
      }
      cfg.bundle[k] = v;
    }
  }
  const verify = sec("verify");
  if ("timeout_s" in verify) {
    const v = verify.timeout_s;
    if (typeof v !== "number" || !(v > 0)) throw new ConfigError(`${CONFIG_FILE}: verify.timeout_s must be a number above 0.`);
    cfg.verify.timeout_s = v;
  }
  // REQ-DIST-002 the globs that gate lints
  const gate = sec("gate");
  if ("markdown" in gate) cfg.gate.markdown = strList(gate.markdown, "gate.markdown");
  return cfg;
}

/** The file that `specctx init` writes. Each key has a comment above it. */
export const INIT_TEXT = `# spec-ctx configuration. Every key is optional. A missing key takes its default.

[scan]
# Main specs. Markdown files with requirement and scenario headers.
specs = ["openspec/specs/**/*.md"]
# Active and archived OpenSpec changes.
changes = ["openspec/changes/**/*.md"]
# Decision records.
decisions = ["decisions/*.md"]
# Source files that carry code tags. A code tag is a comment with a REQ ID.
code = ["src/**"]
# Test files that carry Covers tags and scenario IDs.
tests = ["tests/**"]
# Paths that the scan skips.
ignore = []

[ids]
# Capability codes. check reports a REQ whose code is not in this list. id new accepts only these codes.
# An empty list turns the rule off, and id new accepts any code of 2 to 6 upper case letters.
caps = []
# Pattern of the task number in a tasks.md checkbox.
task_pattern = '\\d+\\.\\d+'

[bundle]
# Default character budget of a bundle.
budget = 8000
# Default depth of related entries in a bundle.
depth = 1

[verify]
# Seconds before task done stops a Verify command.
timeout_s = 600

[gate]
# Markdown globs that gate lints. The baseline holds the lint debt of these files.
markdown = ["openspec/**/*.md", "decisions/*.md", "docs/**/*.md", "*.md"]
`;
