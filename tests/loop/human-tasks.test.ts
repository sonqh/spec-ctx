// Covers: REQ-LOOP-012, SCN-LOOP-012-1, SCN-LOOP-012-2
import { describe, expect, test } from "vitest";
import { renderNext, type Decision } from "../../src/loop/next.ts";

const d = (tasks: string[]): Decision => ({ action: "repair", attempt: 0, change: "001-x", command: "specctx task done 001/1.1", human: false, max_attempts: 3, reason: null, state: "evidence_stale", task: tasks[0] ?? null, tasks });

describe("the tasks line of the human form", () => {
  test("SCN-LOOP-012-1 an empty list prints none and no line ends in a space", () => {
    const out = renderNext(d([]));
    expect(out.split("\n")).toContain("tasks: none");
    expect(out.split("\n").some((l) => l.endsWith(" "))).toBe(false);
  });

  test("SCN-LOOP-012-2 several tasks join with a comma and a space", () => {
    expect(renderNext(d(["001/1.1", "001/1.2"])).split("\n")).toContain("tasks: 001/1.1, 001/1.2");
    expect(renderNext(d(["001/1.1"])).split("\n")).toContain("tasks: 001/1.1");
  });
});
