// REQ-CLI-001 REQ-CLI-002 command actions.
import { resolve } from "node:path";
import type { Io } from "../main.ts";
import type { Parsed } from "./args.ts";
import { UsageExit } from "./errors.ts";
import { findRoot } from "./root.ts";

export async function run(p: Parsed, io: Io): Promise<number> {
  const f = p.flags;
  const json = !!f.json;
  const cmd = p.command!;
  if (cmd === "init") return init(p, io);
  const root = findRoot(io.cwd, f.root as string | undefined);
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
    else io.out(planLines(plan).join("\n") + `\n${plan.edits.length} header(s) to adopt. Run adopt to write them.\n`);
    return plan.edits.length ? 1 : 0;
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
        const data = buildIndex(root, cfg);
        const findings = check(root, cfg, data, strict);
        return { code: findings.length ? 1 : 0, out: findings.map((x) => `${x.file}:${x.line}  ${x.rule}  ${x.id}\n`).join("") + `${findings.length} finding(s)\n` };
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
    case "check": {
      const { check } = await import("../check/check.ts");
      const findings = check(root, cfg, data, !!f.strict);
      let warnings: string[] = [];
      if (f.strict) {
        const { manualWarnings } = await import("../check/evidence.ts");
        const { listEvidence } = await import("../tasks/evidence.ts");
        warnings = manualWarnings(root, entries, listEvidence(root));
      }
      if (json) print({ count: findings.length, findings, warnings });
      else {
        io.out(findings.map((x) => `${x.file}:${x.line}  ${x.rule}  ${x.id}\n`).join(""));
        io.out(warnings.map((w) => `warning: ${w}\n`).join(""));
        io.out(`${findings.length} finding(s)\n`);
      }
      return findings.length ? 1 : 0;
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
  else {
    io.out(r.written.map((w) => `wrote ${w}\n`).join(""));
    io.out(r.kept.map((k) => `kept ${k}\n`).join(""));
  }
  return 0;
}
