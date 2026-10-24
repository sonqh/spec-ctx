// REQ-LINT-001 the --selftest suites of scripts/tells-lint.py and scripts/ste-lint.py, case by case.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Io } from "../main.ts";
import { checkRules, runLint } from "./cli.ts";
import { lintSte, type SteFinding } from "./ste.ts";
import { lintTells } from "./tells.ts";

class SelftestFail extends Error {}

function ok(cond: unknown, what: unknown): void {
  if (!cond) throw new SelftestFail(typeof what === "string" ? what : JSON.stringify(what));
}

function report(io: Io, name: string, fn: () => void | Promise<void>, pass: string): Promise<number> | number {
  const done = (e?: unknown): number => {
    if (e === undefined) {
      io.out(pass + "\n");
      return 0;
    }
    if (e instanceof SelftestFail) {
      io.err(`${name}: selftest failed: ${e.message}\n`);
      return 1;
    }
    throw e;
  };
  try {
    const r = fn();
    return r instanceof Promise ? r.then(() => done(), done) : done();
  } catch (e) {
    return done(e);
  }
}

export function selftestTells(io: Io): Promise<number> | number {
  return report(io, "tells", () => {
    const bad = "It's not just a tool, it's a mirror. The policy — announced today — applies. " +
      "Great question! Let's dive in. At its core it is robust and seamless.\n" +
      "- **Speed:** fast\n";
    const good = "The request may have failed. Check the client version. The tool shows your habits.";
    const fBad = new Set(lintTells(bad).map((f) => f.rule));
    const fGood = lintTells(good);
    const want = ["not-x-its-y", "dash", "chat-residue", "run-up", "deep-saying", "stock-word", "bold-label"];
    const missing = want.filter((w) => !fBad.has(w));
    ok(!missing.length, `selftest: missing ${missing.join(", ")}`);
    ok(!fGood.length, fGood);
  }, "selftest ok");
}

const rules = (fs: SteFinding[], id: string): SteFinding[] => fs.filter((f) => f.rule === id);
const has = (fs: SteFinding[], id: string): boolean => fs.some((f) => f.rule === id);
const L = (text: string, file?: string): SteFinding[] => lintSte(text, file).findings;
const eq = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

export function selftestSte(io: Io): Promise<number> | number {
  return report(io, "ste", async () => {
    let f = L("The panel is removed; spin up the job. Perform an analysis of the seamless log. We have received the report.");
    for (const e of ["semicolon", "phrasal-verb", "nominalization", "marketing-adjective", "passive-voice", "present-perfect"]) ok(has(f, e), e);
    // hedges must never be flagged, including modal + perfect infinitive
    f = L("The request may have failed. It could be a timeout. The disk might have filled.");
    ok(!f.length, f);
    // irregular participles: "has run" is a compound tense as much as "has failed"
    f = L("The task has run. The job has set the flag. We have begun.");
    ok(rules(f, "present-perfect").length === 3, f);
    ok(!has(L("The job may have run."), "present-perfect"), "may have run");
    // modal perfects remain protected across negation and variable whitespace
    for (const modal of ["may", "might", "could", "should", "would", "must"]) {
      for (const gap of [" ", "  ", "\t", " not "]) ok(!has(L(`The task ${modal}${gap}have run.`), "present-perfect"), modal + gap);
    }
    ok(!has(L("The task couldn't have run. The task MAY NOT HAVE RUN."), "present-perfect"), "couldn't");
    f = L("The task has run. We have begun. The flag is set.");
    ok(rules(f, "present-perfect").length === 2, f);
    ok(has(f, "passive-voice"), f);
    ok(!has(L("The task is gone."), "passive-voice"), "is gone");
    // code blocks skipped
    ok(!L("```\nx = a; y = b\n```").length, "fence");
    // all supported list markers, case variants, and trailing whitespace
    f = rules(L("- Confirm the target and\n* Record the result OR  \n+ Close the panel\n1. Start the task and\n2) Stop the task OR"), "dangling-conjunction");
    ok(f.length === 4, f);
    ok(eq(f.map((x) => x.line), [1, 2, 4, 5]), f);
    ok(eq(f.map((x) => x.col), [1, 1, 1, 1]), f);
    ok(f.every((x) => x.level === "advisory-free"), f);
    // valid continuation lines and standalone four-space code are ignored
    ok(!has(L("  - Confirm the target and\n    record the result."), "dangling-conjunction"), "continuation");
    f = rules(L("- Confirm the target\n  and"), "dangling-conjunction");
    ok(f.length === 1 && f[0]!.line === 2, f);
    ok(f[0]!.col === 3, f);
    ok(!has(L("    - code and"), "dangling-conjunction"), "code");
    ok(!has(L("> - Confirm the target and\n> - Record the result or"), "dangling-conjunction"), "quote");
    f = rules(L("- Do this and\n~~~\ncode and\n~~~"), "dangling-conjunction");
    ok(f.length === 1 && f[0]!.line === 1, f);
    ok(!has(L("```text\n- code and\n```"), "dangling-conjunction"), "fenced");
    // one- and three-space markers and ordered continuation width
    ok(!has(L(" - Start the task and\n   record the result."), "dangling-conjunction"), "one space");
    ok(!has(L("-  Start the task and\n   record the result."), "dangling-conjunction"), "two gap");
    ok(!has(L("-\tStart the task and"), "dangling-conjunction"), "tab");
    f = rules(L("   - Start the task and", "fixture.md"), "dangling-conjunction");
    ok(f.length === 1 && f[0]!.col === 4, f);
    ok(f[0]!.file === "fixture.md", f);
    ok(f[0]!.match.endsWith("and"), f);
    ok(f[0]!.message.includes("Complete the item"), f);
    ok(rules(L("100. Start the task and\n  unrelated text"), "dangling-conjunction").length === 1, "100.");
    ok(!has(L("- Start the task and.\n- Stop the task or,"), "dangling-conjunction"), "punctuated");
    ok(!has(L("- Start the task and\n\n  record the result."), "dangling-conjunction"), "blank");
    ok(eq(rules(L("- Parent item and\n  - Nested item or"), "dangling-conjunction").map((x) => x.line), [1, 2]), "nested");
    // ordinary prose, inline code, and fenced code are ignored
    ok(!has(L("The process may include steps and"), "dangling-conjunction"), "prose");
    ok(!has(L("- Use `and` as a label"), "dangling-conjunction"), "code and");
    ok(!has(L("- Combine `left` and `right`"), "dangling-conjunction"), "combine");
    ok(!has(L("~~~\n- code and\n~~~"), "dangling-conjunction"), "tilde");
    ok(has(L(Array(30).fill("word").join(" ") + "."), "long-sentence"), "30 words");
    // Markdown table syntax is layout, not prose. Each cell stays lintable.
    const range = (a: number, b: number): string => Array.from({ length: b - a }, (_, i) => `term${a + i}`).join(" ");
    const shortCell = range(1, 25) + ".";
    for (const table of [`| Label | Detail |\n| --- | --- |\n| Clear | ${shortCell} |`, `Label | Detail\n--- | ---\nClear | ${shortCell}`]) {
      const r = lintSte(table);
      ok(!has(r.findings, "long-sentence"), r.findings);
      ok(r.words === 27, r.words);
    }
    const longCell = range(1, 27) + ".";
    f = rules(L(`| Label | Detail |\n| --- | --- |\n| Clear | ${longCell} |`), "long-sentence");
    ok(f.length === 1, f);
    ok(f[0]!.match === "26 words", f);
    // synonym rotation: second member flagged, first named as the keeper
    f = rules(L("Check the config file. Then verify the output. Verify twice."), "synonym-rotation");
    ok(f.length === 1 && f[0]!.message.includes("'verify' and 'check'"), f);
    ok(!has(L("Check the config. Check the output."), "synonym-rotation"), "one term");
    // per-file labels
    ok(L("a; b", "x.md")[0]!.file === "x.md", "file");
    // inline code is masked, not deleted, so columns match the source
    f = rules(L("Run `make all` then spin up the node."), "phrasal-verb");
    ok(f.length === 1 && f[0]!.col === 21, f);
    // a sentence ends after closing quotes and brackets
    const twenty = Array(20).fill("word").join(" ");
    ok(!has(L(`He asked "${twenty}?" Then ${twenty} ended. (It ${twenty}.) Next.`), "long-sentence"), "quotes");
    // abbreviations do not end a sentence
    ok(has(L(`Use a tool, e.g. the ${twenty} linter here now.`), "long-sentence"), "e.g.");
    ok(has(L(`Compare A vs. B in the ${twenty} test.`), "long-sentence"), "vs.");
    // a sentence wrapped across lines is counted once, at its start
    f = rules(L(`Intro text here.\nThe ${twenty}\nwrapped tail words go here.`), "long-sentence");
    ok(f.length === 1, f);
    ok(f[0]!.line === 2 && f[0]!.col === 1, f);
    ok(has(L(`- Item ${twenty}\n  continued in the same item.`), "long-sentence"), "item");
    // blank lines, headings, rules, list items, and quotes end a prose block
    for (const sep of ["\n\n", "\n# Heading\n", "\n---\n", "\n- ", "\n> "]) ok(!has(L(`First ${twenty} line${sep}Second ${twenty} line.`), "long-sentence"), sep);
    // a GitHub alert marker on the first line of a quote is not a word of the body
    const body = Array(25).fill("word").join(" ") + ".";
    for (const alert of ["> [!NOTE]", "> [!tip]", ">[!Warning]", ">  [!CAUTION]  "]) ok(!has(L(`${alert}\n> ${body}`), "long-sentence"), alert);
    for (const text of [`Text.\n\n> [!NOTE]\n> ${body}`, `> Text.\n~~~\ncode\n~~~\n> [!NOTE]\n> ${body}`]) ok(!has(L(text), "long-sentence"), text);
    const words26 = (fs: SteFinding[]): boolean => eq(rules(fs, "long-sentence").map((x) => x.match), ["26 words"]);
    // inside HTML containers the marker is text: marker plus body is 26 words
    for (const [open, close] of [["<details>", "</details>"], ['<DIV class="note">', "</DIV>"], ["<section><details>", "</details></section>"]]) {
      ok(words26(L(`${open}\n\n> [!NOTE]\n> ${body}\n\n${close}`)), open);
      ok(!has(L(`${open}\n${close}\n\n> [!NOTE]\n> ${body}`), "long-sentence"), open);
    }
    ok(!has(L(`> [!NOTE]\n> ${body}`), "long-sentence"), "note");
    // an inner close or a fenced closing tag must not close the outer container
    for (const content of ["<details>\n<div>\n</div>", "<details>\n~~~\n</details>\n~~~"]) ok(words26(L(`${content}\n\n> [!NOTE]\n> ${body}\n\n</details>`)), content);
    // fenced, commented, inline, void, and self-closing tags do not open containers
    for (const content of ["```html\n<details>\n```", "<!-- <details> -->", "<span>Text.</span>", "<hr>", "<div />", "<details></details>", "</details>"]) {
      ok(!has(L(`${content}\n\n> [!NOTE]\n> ${body}`), "long-sentence"), content);
    }
    // GitHub shows these markers as text, so they stay words
    for (const text of [
      `> [!FOO]\n> ${body}`, `> [!NOTE] ${body}`, `> Intro.\n> [!NOTE]\n> ${body}`,
      `> > [!NOTE]\n> > ${body}`, `> Intro.\ncontinuation.\n> [!NOTE]\n> ${body}`,
      `- Item.\n\n  > [!NOTE]\n  > ${body}`,
      `Text.\n> [!NOTE]\n> ${body}`, `   > [!NOTE]\n   > ${body}`,
    ]) ok(words26(L(text)), text);
    // a bold or italic lead sentence ends at its closing emphasis marker
    ok(!has(L(`**Lead.** The ${twenty} more words here now.`), "long-sentence"), "bold lead");
    ok(!has(L(`_Note._ The ${twenty} more words here now.`), "long-sentence"), "italic lead");
    ok(has(L(`See **e.g.** the ${twenty} linter here now.`), "long-sentence"), "bold e.g.");
    // a dotted abbreviation ends a sentence before a capitalized word
    ok(!has(L(`The team shipped it in the U.S. Then ${twenty} today.`), "long-sentence"), "U.S.");
    // nested list items, quoted list items, and HTML lines end a prose block
    for (const text of [
      `- First item\n    - First ${twenty} line\n      - Second ${twenty} line`,
      `> - First ${twenty} line\n> - Second ${twenty} line`,
      `<!-- First ${twenty} line -->\nSecond ${twenty} line.`,
      `> First ${twenty} line.\n>\n> Second ${twenty} line.`,
    ]) ok(!has(L(text), "long-sentence"), text);
    // a blockquote prefix is not a word in a wrapped quoted sentence
    ok(!has(L("> " + Array(5).fill("word word word word word").join("\n> ") + "."), "long-sentence"), "quote prefix");
    // a list marker is not a word either, in every marker style
    const twentyFive = range(1, 26) + ".";
    for (const marker of ["-", "*", "+", "1.", "1)", "  -", "> -"]) ok(!has(L(`${marker} ${twentyFive}`), "long-sentence"), marker);
    f = rules(L(`- term0 ${twentyFive}`), "long-sentence");
    ok(eq(f.map((x) => [x.match, x.col]), [["26 words", 3]]), f);
    // a code span at the line start does not turn the next token into a list marker
    ok(words26(L(`\`label\` 1) ${twentyFive}`)), "label");
    // bare punctuation is not a word: code span separators and spaced dashes
    for (const separator of [", ", " ", " / "]) {
      const names = Array.from({ length: 30 }, (_, i) => `\`a${i}\``).join(separator);
      ok(!has(L(`The adapters are ${names}.`), "long-sentence"), separator);
    }
    ok(!has(L(range(1, 25) + " — term25."), "long-sentence"), "dash");
    ok(words26(L(`Use \`make\` — ${twentyFive}`)), "make");
    // a long block stays linear: one short sentence per line, no blank lines
    ok(!has(L("The agent read the log.\n".repeat(20000)), "long-sentence"), "linear");
    // flags may appear between file paths
    const tmp = mkdtempSync(join(tmpdir(), "specctx-ste-"));
    try {
      const paths = ["a.md", "b.md"].map((n) => join(tmp, n));
      for (const p of paths) writeFileSync(p, "Short line here.\n");
      let out = "";
      const sink: Io = { cwd: tmp, out: (s) => (out += s), err: () => {} };
      ok((await runLint(["ste", paths[0]!, "--json", paths[1]!], sink)) === 0, "intermixed");
      ok(JSON.parse(out).words === 6, out);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
    // command line parsing rejects typos and bad values
    for (const bad of [["--basline", "3"], ["--baseline"], ["--baseline", "x"], ["--baseline", "-1"], ["--disable", "passive"], ["--base", "3"]]) {
      const sink: Io = { cwd: tmpdir(), out: () => {}, err: () => {} };
      ok((await runLint(["ste", ...bad], sink)) === 2, bad);
    }
    ok(eq([...checkRules("ste", "passive-voice,present-perfect")].sort(), ["passive-voice", "present-perfect"]), "rule list");
  }, "selftest OK");
}
