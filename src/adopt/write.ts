// REQ-ADOPT-002 REQ-ADOPT-003 the adopt write: every file in one operation, a check before and after, rollback.
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { UsageExit } from "../cli/errors.ts";
import { CONFIG_FILE, type Config } from "../config.ts";
import { loadConfigOrExit } from "../cli/config.ts";
import type { Io } from "../main.ts";
import { dumps } from "../util/json.ts";
import { configText, withCaps } from "./config-write.ts";
import type { Plan } from "./plan.ts";

export const REPORT_FILE = "adopt-report.md";

async function findings(root: string): Promise<Set<string>> {
  const { buildIndex } = await import("../index/build.ts");
  const { check } = await import("../check/check.ts");
  const cfg = loadConfigOrExit(root);
  const data = buildIndex(root, cfg);
  return new Set(check(root, cfg, data, false).map((f) => `${f.file}:${f.line}  ${f.rule}  ${f.id}`));
}

function rawLines(text: string): string[] {
  return text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

/** New file contents with the edited header lines. Every other byte stays. */
function editedFiles(root: string, plan: Plan): Map<string, string> {
  const out = new Map<string, string>();
  const byFile = new Map<string, Plan["edits"]>();
  for (const e of plan.edits) byFile.set(e.file, [...(byFile.get(e.file) ?? []), e]);
  for (const [file, edits] of byFile) {
    const lines = rawLines(readFileSync(join(root, file)).toString("utf8"));
    for (const e of edits) {
      const cur = lines[e.line - 1];
      if (cur === undefined) throw new Error(`${file}:${e.line} is missing`);
      const end = cur.match(/\r?\n$/)?.[0] ?? "";
      if (cur.slice(0, cur.length - end.length) !== e.old) throw new UsageExit(`${file}:${e.line} changed during adopt. Run adopt again`);
      lines[e.line - 1] = e.new + end;
    }
    out.set(file, lines.join(""));
  }
  return out;
}

export function reportText(plan: Plan): string {
  const out = ["# Adopt report", "", "`specctx adopt` gave these headers an ID. Review the diff in the pull request, then delete this file.", ""];
  out.push("## Capability codes", "", "Rename a code in `spec-ctx.toml` before the IDs spread.", "", "| Code | Path | Source |", "| --- | --- | --- |");
  for (const c of plan.caps) out.push(`| ${c.code} | ${c.path} | ${c.derived ? "derived" : "existing"} |`);
  out.push("", "## Headers", "", "| File | Line | Old header | New header |", "| --- | --- | --- | --- |");
  const cell = (s: string): string => "`" + s.replace(/\|/g, "\\|").replace(/`/g, "'") + "`";
  for (const e of plan.edits) out.push(`| ${e.file} | ${e.line} | ${cell(e.old)} | ${cell(e.new)} |`);
  out.push("", "## Unmatched", "");
  if (!plan.unmatched.length) out.push("None.");
  else {
    out.push("These delta headers match no main header and no RENAMED line. They kept their text.", "");
    for (const u of plan.unmatched) out.push(`- ${u.file}:${u.line} ${cell(u.header)}`);
  }
  return out.join("\n") + "\n";
}

export async function applyAdopt(root: string, _cfg: Config, plan: Plan, io: Io, json: boolean): Promise<number> {
  const cfgPath = join(root, CONFIG_FILE);
  const cfgBefore = existsSync(cfgPath) ? readFileSync(cfgPath, "utf8") : null;
  const cfgAfter = withCaps(configText(root), plan.caps);
  const cfgChanges = cfgBefore === null ? plan.edits.length > 0 : cfgAfter !== cfgBefore;
  if (!plan.edits.length && !cfgChanges) {
    if (json) io.out(dumps({ adopted: 0, unmatched: plan.unmatched }) + "\n");
    else io.out(plan.unmatched.map((u) => `unmatched: ${u.file}:${u.line}  ${u.header}\n`).join("") + "nothing to adopt\n");
    return 0;
  }
  const next = editedFiles(root, plan);
  next.set(CONFIG_FILE, cfgAfter);
  // REQ-ADOPT-002 findings before the write do not block. Only new ones roll back.
  const before = await findings(root);
  const originals = new Map<string, string | null>();
  for (const file of [...next.keys(), REPORT_FILE]) {
    const p = join(root, file);
    originals.set(file, existsSync(p) ? readFileSync(p).toString("utf8") : null);
  }
  const restore = (): void => {
    for (const [file, text] of originals) {
      const p = join(root, file);
      if (text === null) rmSync(p, { force: true });
      else writeFileSync(p, text);
    }
    rmSync(join(root, ".ctx/index.json"), { force: true });
  };
  try {
    for (const [file, text] of next) writeFileSync(join(root, file), text);
    const after = await findings(root);
    const introduced = [...after].filter((f) => !before.has(f)).sort();
    if (introduced.length) {
      restore();
      if (json) io.out(dumps({ adopted: 0, introduced }) + "\n");
      else io.out(introduced.map((f) => f + "\n").join(""));
      io.err(`specctx: adopt restored every file. The write added ${introduced.length} finding(s).\n`);
      return 1;
    }
    // REQ-CLI-007 no header changed, so no report
    if (plan.edits.length) writeFileSync(join(root, REPORT_FILE), reportText(plan));
  } catch (e) {
    restore();
    throw e;
  }
  rmSync(join(root, ".ctx/index.json"), { force: true });
  const files = new Set(plan.edits.map((e) => e.file)).size;
  const report = plan.edits.length ? REPORT_FILE : null;
  if (json) io.out(dumps({ adopted: plan.edits.length, caps: plan.caps, files, report, unmatched: plan.unmatched }) + "\n");
  else {
    io.out(plan.unmatched.map((u) => `unmatched: ${u.file}:${u.line}  ${u.header}\n`).join(""));
    // REQ-CLI-007 only the codes in spec-ctx.toml changed: no header, no report
    if (!report) io.out(`wrote the codes to ${CONFIG_FILE}\nnothing to adopt\n`);
    else io.out(`adopted ${plan.edits.length} header(s) in ${files} file(s). Report: ${REPORT_FILE}\n`);
  }
  return 0;
}
