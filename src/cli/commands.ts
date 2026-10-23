// REQ-CLI-001 REQ-CLI-002 command actions.
import { existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
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
      if (json) print({ count: findings.length, findings });
      else io.out(findings.map((x) => `${x.file}:${x.line}  ${x.rule}  ${x.id}\n`).join("") + `${findings.length} finding(s)\n`);
      return findings.length ? 1 : 0;
    }
  }
  throw new UsageExit(`unknown command: ${cmd}`);
}

async function init(p: Parsed, io: Io): Promise<number> {
  const { CONFIG_FILE, INIT_TEXT } = await import("../config.ts");
  const root = resolve(io.cwd, (p.flags.root as string | undefined) ?? ".");
  const target = join(root, CONFIG_FILE);
  if (existsSync(target)) {
    io.err(`specctx: ${CONFIG_FILE} exists. Remove it first to write a new one.\n`);
    return 2;
  }
  writeFileSync(target, INIT_TEXT);
  if (p.flags.json) io.out(JSON.stringify({ written: CONFIG_FILE }, null, 2) + "\n");
  else io.out(`wrote ${CONFIG_FILE}\n`);
  return 0;
}
