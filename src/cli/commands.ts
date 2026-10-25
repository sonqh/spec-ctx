// REQ-CLI-001 REQ-CLI-002 command actions.
import { resolve } from "node:path";
import type { Io } from "../main.ts";
import type { Parsed } from "./args.ts";
import { UsageExit } from "./errors.ts";
import { findRoot, requireOpenSpec } from "./root.ts";
import { hintOf } from "../check/hints.ts";

/** check with warnings and the baseline filter. Strict mode adds the strict rules and the warnings. */
async function runCheck(root: string, cfg: import("../config.ts").Config, data: import("../index/types.ts").Index, strict: boolean) {
  const { check } = await import("../check/check.ts");
  const { applyBaseline } = await import("../baseline/baseline.ts");
  const findings = check(root, cfg, data, strict);
  let warnings: string[] = [];
  if (strict) {
    const { manualWarnings } = await import("../check/evidence.ts");
    const { listEvidence } = await import("../tasks/evidence.ts");
    warnings = manualWarnings(root, data.entries, listEvidence(root));
  }
  return applyBaseline(root, findings, warnings);
}

/**
 * REQ-CHK-004 the findings, then a blank line, the summary line, and one line per rule with its hint.
 * A warning counts as advisory. The `baselined` line stays last (REQ-CHK-002).
 */
export function checkText(r: { findings: { file: string; line: number; rule: string; id: string }[]; warnings: string[]; baselined: number }): string {
  const body = r.findings.map((x) => `${x.file}:${x.line}  ${x.rule}  ${x.id}\n`).join("")
    + r.warnings.map((w) => `warning: ${w}\n`).join("");
  const base = r.baselined ? `baselined: ${r.baselined}\n` : "";
  const n = r.findings.length + r.warnings.length;
  if (!n) return `0 findings\n${base}`;
  const files = new Set(r.findings.map((x) => x.file));
  const count = new Map<string, number>();
  for (const x of r.findings) count.set(x.rule, (count.get(x.rule) ?? 0) + 1);
  for (const w of r.warnings) {
    const [rule, task] = w.split(" ");
    count.set(rule!, (count.get(rule!) ?? 0) + 1);
    // a manual-evidence warning names a task. Its file is the evidence file of the task.
    if (task?.includes("/")) files.add(`.ctx/evidence/${task}.json`);
  }
  const rules = [...count.keys()].sort();
  return body
    + `\n${n} finding${n === 1 ? "" : "s"} in ${files.size} file${files.size === 1 ? "" : "s"} (${r.findings.length} hard, ${r.warnings.length} advisory)\n`
    + rules.map((rule) => `${rule}  ${count.get(rule)}  ${hintOf(rule)}\n`).join("")
    + base;
}

export async function run(p: Parsed, io: Io): Promise<number> {
  const f = p.flags;
  const json = !!f.json;
  const cmd = p.command!;
  if (cmd === "init") return init(p, io);
  const root = findRoot(io.cwd, f.root as string | undefined);
  requireOpenSpec(root);
  const { loadConfig, ConfigError } = await import("../config.ts");
  let cfg;
  try {
    cfg = loadConfig(root);
  } catch (e) {
    if (e instanceof ConfigError) throw new UsageExit(e.message);
    throw e;
  }
  const { dumps } = await import("../util/json.ts");
  const print = (v: unknown): void => io.out(dumps(v) + "\n");
  if (cmd === "build") {
    if (p.positional.length) throw new UsageExit("build takes no arguments");
    const { buildIndex, INDEX_PATH } = await import("../index/build.ts");
    const data = buildIndex(root, cfg);
    if (json) print({ entries: data.entries.length, index: INDEX_PATH, problems: data.problems.length });
    else io.out(`indexed ${data.entries.length} entries, ${data.problems.length} problem(s) -> ${INDEX_PATH}\n`);
    return 0;
  }
  if (cmd === "adopt") {
    if (p.positional.length) throw new UsageExit("adopt takes no arguments");
    const { planAdopt, planLines } = await import("../adopt/plan.ts");
    const plan = planAdopt(root, cfg);
    if (!f["dry-run"]) {
      const { applyAdopt } = await import("../adopt/write.ts");
      return applyAdopt(root, cfg, plan, io, json);
    }
    if (json) print(plan);
    else if (!plan.edits.length) io.out(plan.unmatched.length ? planLines(plan).join("\n") + "\nnothing to adopt\n" : "nothing to adopt\n");
    // REQ-CLI-007 the dry run ends with the next step. The exit code stays 1.
    else io.out(planLines(plan).join("\n") + `\n${plan.edits.length} headers need an ID. Next: specctx adopt\n`);
    return plan.edits.length ? 1 : 0;
  }
  if (cmd === "baseline write" || cmd === "baseline prune") {
    if (p.positional.length) throw new UsageExit(`${cmd} takes no arguments`);
    const { buildIndex } = await import("../index/build.ts");
    const { check } = await import("../check/check.ts");
    const { manualWarnings } = await import("../check/evidence.ts");
    const { listEvidence } = await import("../tasks/evidence.ts");
    const { writeBaseline, pruneBaseline, BASELINE_PATH } = await import("../baseline/baseline.ts");
    const data = buildIndex(root, cfg);
    const findings = check(root, cfg, data, true);
    const warnings = manualWarnings(root, data.entries, listEvidence(root));
    if (cmd === "baseline write") {
      const list = writeBaseline(root, findings, warnings);
      if (json) print({ baseline: BASELINE_PATH, entries: list.length });
      else io.out(`wrote ${BASELINE_PATH} with ${list.length} entr${list.length === 1 ? "y" : "ies"}\n`);
    } else {
      const n = pruneBaseline(root, findings, warnings);
      if (json) print({ pruned: n });
      else io.out(`pruned ${n}\n`);
    }
    return 0;
  }
  if (cmd === "gate") {
    if (p.positional.length) throw new UsageExit("gate takes no arguments");
    const { runGate, DEFAULT_MARKDOWN } = await import("./gate.ts");
    const strict = !!f.strict;
    return runGate(root, {
      strict,
      markdown: (f.markdown as string | undefined) ?? DEFAULT_MARKDOWN,
      check: async () => {
        const { buildIndex } = await import("../index/build.ts");
        const { check } = await import("../check/check.ts");
        void check;
        const data = buildIndex(root, cfg);
        const r = await runCheck(root, cfg, data, strict);
        return { code: r.findings.length ? 1 : 0, out: checkText(r) };
      },
    }, io);
  }
  const { loadIndex } = await import("../index/build.ts");
  const need = (n: number, what: string): void => {
    if (p.positional.length < n) throw new UsageExit(`${cmd} needs ${what}`);
  };
  if (cmd === "query") need(1, "at least one term");
  if (cmd === "related") {
    need(1, "one ID");
    if (p.positional.length > 1) throw new UsageExit("related takes one ID");
  }
  if (cmd === "bundle") need(1, "at least one ID");
  if ((cmd === "status" || cmd === "check") && p.positional.length) throw new UsageExit(`${cmd} takes no arguments`);
  const { data, rebuilt } = loadIndex(root, cfg);
  if (rebuilt) io.err("index rebuilt\n");
  const entries = data.entries;
  if (cmd.includes(" ")) {
    const { runWorkflow } = await import("./workflow.ts");
    return runWorkflow({ root, cfg, data, p, io, json });
  }
  const all = !!f.all;
  switch (cmd) {
    case "status": {
      const { statusReport, statusLines } = await import("./status.ts");
      const r = statusReport(root, entries);
      if (json) print(r);
      else io.out(statusLines(r).map((l) => l + "\n").join(""));
      return 0;
    }
    case "query": {
      const { query, queryLine } = await import("../graph/query.ts");
      const hits = query(entries, p.positional, {
        kind: f.kind as string | undefined, change: f.change as string | undefined, all, limit: (f.limit as number | undefined) ?? 20,
      });
      if (json) print(hits);
      else io.out(hits.map((e) => queryLine(e) + "\n").join(""));
      return 0;
    }
    case "related": {
      const { canon } = await import("../index/canonical.ts");
      const { related } = await import("../graph/related.ts");
      const id = p.positional[0]!;
      const ids = canon(entries);
      if (!ids.has(id) && !(all && entries.some((e) => e.id === id))) {
        io.err(`unknown id ${id}\n`);
        return 2;
      }
      const rows: [(typeof entries)[number], string][] = [];
      for (const [i, reason] of related(entries, id, (f.depth as number | undefined) ?? 1, all)) {
        const copies = all ? entries.filter((e) => e.id === i) : ids.has(i) ? [ids.get(i)!] : [];
        // canonical copy first, the rest in index order
        copies.sort((a, b) => Number(!a.canonical) - Number(!b.canonical));
        for (const e of copies) rows.push([e, reason]);
      }
      if (json) print(rows.map(([e, reason]) => ({ ...e, reason })));
      else io.out(rows.map(([e, r]) => `${e.kind}  ${e.id}  ${e.status}  ${e.file}:${e.line}  ${r}\n`).join(""));
      return 0;
    }
    case "bundle": {
      const { canon } = await import("../index/canonical.ts");
      const { bundle } = await import("../graph/bundle.ts");
      const ids = canon(entries);
      const unknown = p.positional.filter((i) => !ids.has(i));
      if (unknown.length) {
        io.err(`unknown id(s): ${unknown.join(", ")}\n`);
        return 2;
      }
      const b = bundle(root, entries, p.positional, (f.budget as number | undefined) ?? cfg.bundle.budget,
        (f.depth as number | undefined) ?? cfg.bundle.depth, all);
      if (json) print(b);
      else io.out(b.text);
      return 0;
    }
    case "stats": {
      if (p.positional.length) throw new UsageExit("stats takes no arguments");
      const { check } = await import("../check/check.ts");
      const { manualWarnings } = await import("../check/evidence.ts");
      const { listEvidence } = await import("../tasks/evidence.ts");
      const { computeStats, statsTable } = await import("../stats/stats.ts");
      const s = computeStats(root, entries, check(root, cfg, data, true), manualWarnings(root, entries, listEvidence(root)), f.change as string | undefined);
      if (f.write) {
        const { writeStats } = await import("../stats/write.ts");
        const rel = writeStats(root, s);
        if (!json) io.out(`wrote ${rel}\n`);
      }
      if (json) print(s);
      else io.out(statsTable(s).map((l) => l + "\n").join(""));
      return 0;
    }
    case "check": {
      const r = await runCheck(root, cfg, data, !!f.strict);
      if (json) print({ baselined: r.baselined, count: r.findings.length, findings: r.findings, warnings: r.warnings });
      else io.out(checkText(r));
      return r.findings.length ? 1 : 0;
    }
  }
  throw new UsageExit(`unknown command: ${cmd}`);
}

async function init(p: Parsed, io: Io): Promise<number> {
  const { runInit } = await import("../init/init.ts");
  if (p.positional.length) throw new UsageExit("init takes no arguments");
  const root = resolve(io.cwd, (p.flags.root as string | undefined) ?? ".");
  const all = !!p.flags.all;
  const r = runInit(root, { schema: all || !!p.flags.schema, skills: all || !!p.flags.skills, force: !!p.flags.force });
  if (p.flags.json) io.out(JSON.stringify(r, null, 2) + "\n");
  else if (r.nothing) io.out("nothing to do\nnext: specctx status\n");
  else {
    io.out(r.written.map((w) => `wrote ${w}\n`).join(""));
    io.out(r.kept.map((k) => `kept ${k}\n`).join(""));
    // REQ-CLI-007 init ends with the next step
    io.out("next: specctx status\n");
  }
  return 0;
}
