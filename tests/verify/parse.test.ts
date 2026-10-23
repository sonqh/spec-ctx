// Covers: REQ-VER-001
import { describe, expect, test } from "vitest";
import { codeSpans, parseVerify } from "../../src/verify/parse.ts";

describe("Verify parsing", () => {
  test("SCN-VER-001-1 one span", () => {
    expect(parseVerify("- [ ] 2.1 Do it. [REQ-VER-001] Verify: `bun test tests/a.test.ts`")).toEqual({
      kind: "command", command: "bun test tests/a.test.ts",
    });
  });

  test("SCN-VER-001-2 two spans join with &&", () => {
    expect(parseVerify("- [ ] 2.1 Do it. Verify: `bun run build` and `node dist/cli.js --version`").command)
      .toBe("bun run build && node dist/cli.js --version");
  });

  test("SCN-VER-001-3 prose is manual", () => {
    expect(parseVerify("- [ ] 2.1 Do it. Verify: read the transcript")).toEqual({ kind: "manual", command: null });
    expect(parseVerify("- [ ] 2.1 Do it with no clause")).toEqual({ kind: "manual", command: null });
  });

  test("spans before Verify: do not count", () => {
    expect(parseVerify("- [ ] 1.1 Add `smol-toml`. Verify: `bun install`").command).toBe("bun install");
  });

  test("double backtick spans hold a backtick", () => {
    expect(codeSpans("Verify: `` echo `x` `` and `y`")).toEqual(["echo `x`", "y"]);
    expect(codeSpans("an `unclosed span")).toEqual([]);
  });
});
