// REQ-IDS-001 REQ-TASK-001 REQ-TASK-002 REQ-TASK-007 REQ-TASK-003 REQ-TASK-005 REQ-VER-002 REQ-HND-001 REQ-LOOP-002 write commands.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Config } from "../config.ts";
import type { Index } from "../index/types.ts";
import type { Io } from "../main.ts";
import { dumps } from "../util/json.ts";
import type { Parsed } from "./args.ts";
import { paint } from "./color.ts";
import { UsageExit } from "./errors.ts";
import { runCommand } from "../runcmd.ts";

/** REQ-CLI-010 a command to print, with the run prefix of the config (043/D1). */
const rc = (c: Ctx, args: string): string => runCommand(c.cfg.cli.run, args);

export interface Ctx {
  root: string;
  cfg: Config;
  data: Index;
  p: Parsed;
  io: Io;
  json: boolean;
}

const arg = (c: Ctx, n: number, what: string): string => {
  const v = c.p.positional[n];
  if (v === undefined) throw new UsageExit(`${c.p.command} needs ${what}`);
  return v;
};
const noMore = (c: Ctx, n: number): void => {
  if (c.p.positional.length > n) throw new UsageExit(`${c.p.command} takes ${n} argument(s)`);
};
const print = (c: Ctx, v: unknown): void => c.io.out(dumps(v) + "\n");

export async function runWorkflow(c: Ctx): Promise<number> {
  const entries = c.data.entries;
  const f = c.p.flags;
  switch (c.p.command) {
    case "id new": {
      const { newIds } = await import("../ids/ids.ts");
      const kind = arg(c, 0, "a kind: REQ, SCN, ADR, or DEC");
      noMore(c, 2);
      const ids = newIds(c.root, c.cfg, entries, {
        kind, cap: c.p.positional[1], forReq: f.for as string | undefined, count: (f.count as number | undefined) ?? 1,
      });
      if (c.json) print(c, ids);
      else c.io.out(ids.map((i) => i + "\n").join(""));
      return 0;
    }
    case "id retire": {
      const { retire } = await import("../ids/ids.ts");
      const id = arg(c, 0, "an ID");
      const reason = c.p.positional.slice(1).join(" ");
      const row = retire(c.root, entries, id, reason);
      if (c.json) print(c, { retired: id, row });
      else c.io.out(`retired ${id} in decisions/retired-ids.md\n`);
      return 0;
    }
    case "task next": {
      noMore(c, 0);
      const { nextTask } = await import("../tasks/tasks.ts");
      const t = nextTask(c.root, entries, f.change as string | undefined);
      if (!t) {
        if (c.json) print(c, null);
        else {
          // REQ-TASK-001 name the next step. The exit code stays 1.
          const { activeChanges } = await import("../tasks/tasks.ts");
          const { matchesChange } = await import("../index/scan.ts");
          const want = f.change as string | undefined;
          const ready = activeChanges(entries).filter((x) => !want || matchesChange(x, want));
          c.io.out(ready.length
            ? `no open task. Every task in the active changes is done. Next: archive ${ready.join(", ")}.\n`
            : "no open task. No active change has a task.\n");
        }
        return 1;
      }
      // REQ-TASK-007 the command names the answer that task start prints
      const bundleCommand = rc(c, `context ${t.id} --budget ${c.cfg.bundle.budget}`);
      if (c.json) {
        print(c, { bundle_command: bundleCommand, change: t.change, id: t.id, reqs: t.reqs, text: t.text, verify: t.verify.command });
      } else {
        c.io.out(`${t.id}  ${t.text}\nreqs: ${t.reqs.join(", ") || "none"}\nverify: ${t.verify.command ?? "manual"}\n`);
      }
      return 0;
    }
    case "task start": {
      const { findTask } = await import("../tasks/tasks.ts");
      const t = findTask(c.root, entries, arg(c, 0, "a task ID"));
      noMore(c, 1);
      if (t.done) throw new UsageExit(`task ${t.id} is done`);
      if (t.archived) throw new UsageExit(`task ${t.id} is in an archived change`);
      const { canon } = await import("../index/canonical.ts");
      const { bundle } = await import("../graph/bundle.ts");
      const ids = canon(entries);
      for (const r of t.reqs.filter((x) => !ids.has(x))) c.io.err(`warning: task ${t.id} cites ${r}, which the index does not hold\n`);
      // 047/D5 the entry that findTask found goes in, so an active task wins over an archived one with its number
      const b = bundle(c.root, entries, [t.id], c.cfg.bundle.budget, c.cfg.bundle.depth, { task: t.entry });
      const { isoNow } = await import("../util/time.ts");
      const { CURRENT_PATH } = await import("../handoff/handoff.ts");
      mkdirSync(join(c.root, ".ctx"), { recursive: true });
      const { cpLen } = await import("../util/pystr.ts");
      // REQ-STAT-002 the bundle size goes next to the current task, so stats can compute the context ratio
      // REQ-TASK-002 the Verify command is frozen here, so task done can refuse a changed one (019/D3)
      writeFileSync(join(c.root, CURRENT_PATH), dumps({ bundle_chars: cpLen(b.text), started_at: isoNow(), task: t.id, verify: t.verify.command }) + "\n");
      // REQ-TASK-002 a task that cites no REQ gets one hint line, so the agent knows what to add
      const hint = t.reqs.length ? null : `task ${t.id} cites no REQ. Run ${rc(c, `query --change ${t.change} --kind req`)} to list its requirements, then add [REQ-<CAP>-NNN] to the task line.`;
      if (c.json) print(c, { bundle: b, hint, task: t.id });
      else c.io.out(b.text + (hint ? hint + "\n" : "") + footer(cpLen(b.text), (await import("../stats/stats.ts")).specCharsOf(entries)));
      return 0;
    }
    case "task verify":
    case "task done": {
      const { findTask, setBox, hasEvidence } = await import("../tasks/tasks.ts");
      const t = findTask(c.root, entries, arg(c, 0, "a task ID"));
      noMore(c, 1);
      const dry = c.p.command === "task verify";
      const manual = f.manual as string | undefined;
      if (!dry && manual !== undefined) {
        if (!manual.trim()) throw new UsageExit("--manual needs a note");
        // REQ-TASK-003 a task with a Verify command gets no manual note (019/D1, ADR-004)
        if (t.verify.command !== null) throw new UsageExit(`task ${t.id} has a Verify command. Run it with ${rc(c, `task done ${t.id}`)}.`);
        if (t.done && hasEvidence(c.root, t)) throw new UsageExit(`task ${t.id} is done`);
        const { writeEvidence } = await import("../tasks/evidence.ts");
        const rel = writeEvidence(c.root, t, entries, { command: null, exit: null, stdout_sha256: null, stderr_tail: "" }, "manual", manual.trim());
        if (!t.done) setBox(c.root, t, true);
        clearCurrent(c.root, t.id);
        if (c.json) print(c, { evidence: rel, kind: "manual", task: t.id });
        else c.io.out(paint("ok", `done ${t.id} (manual). Evidence: ${rel}\n`, c.io.tty));
        return 0;
      }
      // REQ-TASK-003 a ticked task with evidence is done. One without evidence gets the repair run (019/D2).
      if (!dry && t.done && hasEvidence(c.root, t)) throw new UsageExit(`task ${t.id} is done`);
      if (t.verify.command === null) {
        throw new UsageExit(`task ${t.id} has no Verify command. ${dry ? "Nothing to run" : 'A --manual "<note>" is required'}`);
      }
      // REQ-TASK-003 the Verify command that task start froze must still be the one on the task line (019/D3)
      if (!dry) {
        const frozen = readCurrent(c.root);
        if (frozen && frozen.task === t.id && typeof frozen.verify === "string" && frozen.verify !== t.verify.command) {
          throw new UsageExit(`task ${t.id}: the Verify command changed since task start. Run ${rc(c, `task start ${t.id}`)} again.`);
        }
      }
      const { runVerify, tail } = await import("../verify/run.ts");
      const { resolve: resolvePath, relative, isAbsolute } = await import("node:path");
      let dir = c.root;
      if (t.verify.cwd !== undefined) {
        // REQ-VER-004 the cwd prefix must stay inside the project root
        dir = resolvePath(c.root, t.verify.cwd);
        const rel = relative(c.root, dir);
        if (rel.startsWith("..") || isAbsolute(rel)) throw new UsageExit(`the Verify cwd ${t.verify.cwd} is outside the project root`);
        const { existsSync: exists } = await import("node:fs");
        if (!exists(dir)) throw new UsageExit(`the Verify cwd ${t.verify.cwd} does not exist`);
      }
      const r = await runVerify(t.verify.command, dir, c.cfg.verify.timeout_s);
      const outTail = tail(r.output);
      if (dry) {
        if (c.json) print(c, { command: t.verify.command, exit: r.exit, tail: outTail, timed_out: r.timedOut });
        else c.io.out(`${outTail ? outTail + "\n" : ""}exit ${r.timedOut ? "timeout" : r.exit}\n`);
        return r.exit === 0 ? 0 : 1;
      }
      if (r.timedOut || r.exit !== 0) {
        const msg = r.timedOut ? `verify timed out after ${c.cfg.verify.timeout_s}s` : `verify failed with exit ${r.exit}`;
        // REQ-LOOP-002 the fail file is the retry record. At the cap, one question stops the loop (024/D4, 024/D5).
        const { writeFail, openQuestionFor, capQuestion, blockedLine } = await import("../loop/fails.ts");
        const { addQuestion } = await import("../handoff/questions.ts");
        const fail = writeFail(c.root, t.id, { command: t.verify.command, exit: r.timedOut ? null : r.exit }, outTail);
        let question: number | null = openQuestionFor(c.root, t.id)?.n ?? null;
        if (question === null && fail.file.attempt >= c.cfg.loop.max_attempts) {
          question = addQuestion(c.root, t.id, capQuestion(t.id, fail.file.attempt, outTail), "cap").n;
        }
        if (c.json) print(c, { attempt: fail.file.attempt, command: t.verify.command, error: msg, exit: r.exit, fail: fail.rel, question, tail: outTail, task: t.id });
        else c.io.out(outTail ? outTail + "\n" : "");
        // REQ-VER-003 a timeout keeps its own line on stderr
        if (r.timedOut) c.io.err(`specctx: ${msg}. Task ${t.id} stays open.\n`);
        // REQ-TASK-003 the refusal is the last line of the output. REQ-CLI-008 it is red on a TTY.
        else if (!c.json) c.io.out(paint("fail", `Verify failed (exit ${r.exit}). The task stays open.\n`, c.io.tty));
        // REQ-LOOP-002 the blocked line comes after the failure text, so the last line names the way out
        if (!c.json && question !== null) c.io.out(blockedLine(question, c.cfg.cli.run) + "\n");
        return 1;
      }
      const { sha256 } = await import("../util/hash.ts");
      const { writeEvidence } = await import("../tasks/evidence.ts");
      // the Verify command can change tagged files, so the digests come from the tree after the run
      const { loadIndex } = await import("../index/build.ts");
      const after = loadIndex(c.root, c.cfg).data.entries;
      const rel = writeEvidence(c.root, t, after, {
        command: t.verify.command, exit: 0, stdout_sha256: sha256(r.stdout), stderr_tail: tail(r.stderr.toString("utf8")),
      }, "command", undefined, t.verify.cwd);
      setBox(c.root, t, true);
      clearCurrent(c.root, t.id);
      // REQ-LOOP-014 a pass closes the attempt-cap question of the task. Plan, design, and archive questions stay (044/D3).
      const { isCapQuestion } = await import("../loop/fails.ts");
      const { readQuestions, resolveQuestion } = await import("../handoff/questions.ts");
      for (const q of readQuestions(c.root)) {
        if (isCapQuestion(q, t.id)) resolveQuestion(c.root, q.n, "Verify passed. Resolved by task done.");
      }
      if (c.json) print(c, { evidence: rel, kind: "command", task: t.id });
      else c.io.out(paint("ok", `done ${t.id}. Evidence: ${rel}\n`, c.io.tty)); // REQ-CLI-008
      return 0;
    }
    case "task reopen": {
      const { findTask, setBox } = await import("../tasks/tasks.ts");
      const t = findTask(c.root, entries, arg(c, 0, "a task ID"));
      const reason = c.p.positional.slice(1).join(" ").trim();
      if (!reason) throw new UsageExit("task reopen needs a reason");
      if (!t.done) throw new UsageExit(`task ${t.id} is open`);
      if (t.archived) throw new UsageExit(`task ${t.id} is in an archived change`);
      const { retireEvidence } = await import("../tasks/evidence.ts");
      const { addReopened } = await import("../handoff/handoff.ts");
      setBox(c.root, t, false);
      const moved = retireEvidence(c.root, t, reason);
      addReopened(c.root, entries, t.id, reason);
      if (c.json) print(c, { evidence: moved, task: t.id });
      else c.io.out(`reopened ${t.id}.${moved ? ` Old evidence: ${moved}` : ""}\n`);
      return 0;
    }
    case "handoff write": {
      noMore(c, 0);
      const { writeHandoff, HANDOFF_PATH } = await import("../handoff/handoff.ts");
      const h = writeHandoff(c.root, entries);
      if (c.json) print(c, h);
      else {
        // REQ-HND-002 the one time move of old questions into questions.json (022/D8)
        if (h.migrated) c.io.out(`migrated ${h.migrated} question(s) to .ctx/questions.json\n`);
        c.io.out(`wrote ${HANDOFF_PATH}\n`);
      }
      return 0;
    }
    case "handoff ask": {
      const { ask } = await import("../handoff/handoff.ts");
      const plan = c.p.flags.plan === true;
      if (plan && c.p.flags.change === undefined) throw new UsageExit("--plan needs --change");
      const h = ask(c.root, entries, c.p.positional.join(" "), c.p.flags.change as string | undefined, plan);
      if (c.json) print(c, { open_questions: h.open_questions });
      else c.io.out(`open question ${h.asked ?? h.open_questions.length} added\n`);
      return 0;
    }
    case "handoff resolve": {
      const { resolve } = await import("../handoff/handoff.ts");
      const n = arg(c, 0, "a question number");
      if (!/^\d+$/.test(n)) throw new UsageExit("handoff resolve needs a question number");
      const h = resolve(c.root, entries, Number(n), c.p.positional.slice(1).join(" "));
      if (c.json) print(c, { open_questions: h.open_questions, resolved: h.resolved });
      else c.io.out(`resolved question ${n}\n`);
      return 0;
    }
  }
  throw new UsageExit(`unknown command: ${c.p.command}`);
}

/** The current task file, or null when it is absent or damaged. */
function readCurrent(root: string): { task?: string; verify?: unknown } | null {
  const p = join(root, ".ctx/current.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as { task?: string; verify?: unknown };
  } catch {
    return null;
  }
}

function clearCurrent(root: string, task: string): void {
  const p = join(root, ".ctx/current.json");
  if (!existsSync(p)) return;
  try {
    const cur = JSON.parse(readFileSync(p, "utf8")) as { task?: string };
    if (cur.task === task) rmSync(p);
  } catch {
    // a damaged current.json stays for the user to read
  }
}

// REQ-TASK-002 the footer of task start: the bundle size and its share of the spec text. bundle never prints it.
export function footer(n: number, m: number): string {
  const p = m > 0 ? Math.round((n / m) * 1000) / 10 : 0;
  return `-- bundle ${n} chars, ${p}% of ${m} chars of spec text\n`;
}
