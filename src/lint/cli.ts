// REQ-LINT-001 `specctx lint tells|ste`: the flags, output, and exit codes of scripts/tells-lint.py and scripts/ste-lint.py.
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import type { Io } from "../main.ts";
import { PyFloat, pyInt, pyJson, pyStrip, round1 } from "./py.ts";
import { lintSte, STE_IDS, type SteFinding } from "./ste.ts";
import { lintTells, TELLS_IDS, type TellsFinding } from "./tells.ts";

export const LINTERS = ["tells", "ste"] as const;
export type Linter = (typeof LINTERS)[number];

export class LintUsage extends Error {}

interface LintArgs {
  files: string[];
  json: boolean;
  baseline: number;
  disable: string | null;
  selftest: boolean;
  help: boolean;
}

const OPTIONS = ["--json", "--baseline", "--disable", "--selftest", "--help"];
const TAKES_VALUE = new Set(["--baseline", "--disable"]);
const NEGATIVE_NUMBER = /^-\d+$|^-\d*\.\d+$/;

/**
 * The argparse rules of the two scripts. `tells` accepts option prefixes and one run of files.
 * `ste` accepts no prefixes and files between options.
 */
export function parseLintArgs(linter: Linter, argv: string[]): LintArgs {
  const a: LintArgs = { files: [], json: false, baseline: 0, disable: null, selftest: false, help: false };
  const extra: string[] = [];
  let runs = 0;
  let lastWasFile = false;
  let onlyFiles = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const isOption = !onlyFiles && arg.startsWith("-") && arg !== "-" && !NEGATIVE_NUMBER.test(arg);
    if (!isOption) {
      if (!lastWasFile) runs++;
      lastWasFile = true;
      if (linter === "ste" || runs === 1) a.files.push(arg);
      else extra.push(arg);
      continue;
    }
    if (arg === "--") {
      onlyFiles = true;
      lastWasFile = false;
      continue;
    }
    lastWasFile = false;
    let name = arg;
    let value: string | undefined;
    const eq = arg.indexOf("=");
    if (arg.startsWith("--") && eq > 0) {
      name = arg.slice(0, eq);
      value = arg.slice(eq + 1);
    }
    if (name === "-h") name = "--help";
    if (!OPTIONS.includes(name)) {
      const hits = linter === "tells" && name.startsWith("--") ? OPTIONS.filter((o) => o.startsWith(name)) : [];
      if (hits.length === 1) name = hits[0]!;
      else if (hits.length > 1) throw new LintUsage(`ambiguous option: ${name} could match ${hits.join(", ")}`);
      else {
        extra.push(arg);
        continue;
      }
    }
    if (TAKES_VALUE.has(name)) {
      if (value === undefined) {
        const next = argv[i + 1];
        if (next === undefined || (next.startsWith("-") && !NEGATIVE_NUMBER.test(next))) throw new LintUsage(`argument ${name}: expected one argument`);
        value = next;
        i++;
      }
      if (name === "--baseline") {
        const n = pyInt(value);
        if (linter === "tells" && Number.isNaN(n)) throw new LintUsage(`argument --baseline: invalid int value: '${value}'`);
        if (linter === "ste" && !(n >= 0)) throw new LintUsage(`argument --baseline: expected a non-negative integer, got '${value}'`);
        a.baseline = n;
      } else {
        if (linter === "ste") checkRules(linter, value, true);
        a.disable = value;
      }
    } else if (value !== undefined) {
      throw new LintUsage(`argument ${name}: ignored explicit argument '${value}'`);
    } else if (name === "--json") a.json = true;
    else if (name === "--selftest") a.selftest = true;
    else a.help = true;
    if (a.help) return a;
  }
  if (extra.length) throw new LintUsage(`unrecognized arguments: ${extra.join(" ")}`);
  return a;
}

/** The rule IDs in a --disable value. An unknown ID is a usage error. */
export function checkRules(linter: Linter, value: string, argparse = false): Set<string> {
  const ids = linter === "tells" ? TELLS_IDS : STE_IDS;
  const rules = new Set(linter === "tells" ? value.split(",").map(pyStrip).filter(Boolean) : value.split(",").filter(Boolean));
  const unknown = [...rules].filter((r) => !ids.includes(r)).sort();
  if (unknown.length) {
    const msg = `unknown rule(s): ${unknown.join(", ")}`;
    throw new LintUsage(argparse ? `argument --disable: ${msg}. Known rules: ${[...ids].sort().join(", ")}` : msg);
  }
  return rules;
}

/** The file text as Python reads it: UTF-8, universal newlines. */
function readText(io: Io, p: string): string {
  const abs = resolve(io.cwd, p);
  let st;
  try {
    st = statSync(abs);
  } catch {
    throw new LintUsage(`cannot read ${p}: No such file or directory`);
  }
  if (st.isDirectory()) throw new LintUsage(`cannot read ${p}: Is a directory`);
  try {
    return readFileSync(abs, "utf8").replace(/\r\n?/g, "\n");
  } catch {
    throw new LintUsage(`cannot read ${p}: Permission denied`);
  }
}

function readStdin(): string {
  try {
    return readFileSync(0, "utf8").replace(/\r\n?/g, "\n");
  } catch {
    return "";
  }
}

const USAGE: Record<Linter, string> = {
  tells: "usage: specctx lint tells [-h] [--json] [--baseline BASELINE] [--disable DISABLE] [--selftest] [files ...]\n",
  ste: "usage: specctx lint ste [-h] [--json] [--baseline N] [--disable RULES] [--selftest] [FILE ...]\n",
};

/** `specctx lint <linter> ...`. Exit 0, 1 when hard findings exceed the baseline, 2 on a usage error. */
export async function runLint(argv: string[], io: Io): Promise<number> {
  const linter = argv[0];
  if ((linter === "--help" || linter === "-h") && argv.length === 1) {
    const { helpFor } = await import("../cli/help.ts");
    io.out(helpFor("lint")!);
    return 0;
  }
  if (linter !== "tells" && linter !== "ste") {
    io.err(`specctx: lint needs a subcommand: ${LINTERS.join(", ")}\n`);
    return 2;
  }
  const usage = (msg: string): number => {
    io.err(`${USAGE[linter]}specctx lint ${linter}: error: ${msg}\n`);
    return 2;
  };
  let a: LintArgs;
  try {
    a = parseLintArgs(linter, argv.slice(1));
  } catch (e) {
    if (e instanceof LintUsage) return usage(e.message);
    throw e;
  }
  if (a.help) {
    // REQ-CLI-006 the lint pages render from the help table in the same layout
    const { helpFor } = await import("../cli/help.ts");
    io.out(helpFor(`lint ${linter}`)!);
    return 0;
  }
  if (a.selftest) {
    const { selftestTells, selftestSte } = await import("./selftest.ts");
    return linter === "tells" ? selftestTells(io) : selftestSte(io);
  }
  return linter === "tells" ? runTells(a, io) : runSte(a, io, usage);
}

function runTells(a: LintArgs, io: Io): number {
  let disabled: Set<string>;
  try {
    disabled = checkRules("tells", a.disable ?? "");
  } catch (e) {
    io.err(`${(e as Error).message}\n`);
    return 2;
  }
  const sources: [string, string][] = [];
  if (a.files.length) {
    for (const p of a.files) {
      try {
        sources.push([p, readText(io, p)]);
      } catch (e) {
        io.err(`${(e as Error).message}\n`);
        return 2;
      }
    }
  } else sources.push(["<stdin>", readStdin()]);
  let hard = 0;
  const report: { file: string; findings: TellsFinding[] }[] = [];
  let out = "";
  for (const [name, text] of sources) {
    const fs = lintTells(text, disabled);
    hard += fs.filter((f) => f.level === "hard").length;
    report.push({ file: name, findings: fs });
    if (!a.json) for (const f of fs) out += `${name}:${f.line}: [${f.level}] ${f.rule}: ${f.match}\n`;
  }
  out += a.json ? pyJson(report, false) + "\n" : `${hard} hard finding(s), baseline ${a.baseline}\n`;
  io.out(out);
  return hard > a.baseline ? 1 : 0;
}

function runSte(a: LintArgs, io: Io, usage: (m: string) => number): number {
  const disabled = new Set(a.disable === null ? [] : a.disable.split(",").filter(Boolean));
  let findings: SteFinding[] = [];
  let words = 0;
  if (a.files.length) {
    for (const p of a.files) {
      let text: string;
      try {
        text = readText(io, p);
      } catch (e) {
        return usage((e as Error).message);
      }
      const r = lintSte(text, p);
      findings.push(...r.findings);
      words += r.words;
    }
  } else ({ findings, words } = lintSte(readStdin()));
  findings = findings.filter((f) => !disabled.has(f.rule));
  const hard = findings.filter((f) => f.level === "advisory-free").length;
  io.out(steReport(findings, words, a.json, hard, a.baseline));
  return hard > a.baseline ? 1 : 0;
}

export function steReport(findings: SteFinding[], words: number, json: boolean, hard: number, baseline: number): string {
  const rate = words ? round1((findings.length * 100) / words) : "0.0";
  if (json) {
    return pyJson({ violations: findings, count: findings.length, hard_count: hard, baseline, words, per_100_words: new PyFloat(rate) }, true) + "\n";
  }
  let out = "";
  for (const f of findings) out += `${f.file}:${f.line}:${f.col} ${f.rule}: ${f.message} [${f.match}]\n`;
  out += `\n${findings.length} violations (${hard} hard, baseline ${baseline}), ${words} words, ${rate} per 100 words\n`;
  out += "Hedges/modality (may, might, could) are never flagged: confidence is content.\n";
  return out;
}
