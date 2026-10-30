// Covers: REQ-CLI-010
import { afterEach, describe, expect, test } from "vitest";
import { defaults, loadConfig } from "../../src/config.ts";
import { runCommand } from "../../src/runcmd.ts";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

describe("[cli] run", () => {
  test("SCN-CLI-010-3 no section gives the default", () => {
    p = new Project();
    expect(loadConfig(p.root).cli.run).toBe("specctx");
    expect(defaults().cli).toEqual({ run: "specctx" });
    p.write("spec-ctx.toml", '[cli]\nrun = "node dist/cli.js"\n');
    expect(loadConfig(p.root).cli.run).toBe("node dist/cli.js");
  });

  test("SCN-CLI-010-3 an empty string and a number exit 2 and name cli.run", async () => {
    p = new Project();
    for (const v of ['""', "5", '"  "']) {
      p.write("spec-ctx.toml", `[cli]\nrun = ${v}\n`);
      const r = await p.run("status");
      expect(r.code).toBe(2);
      expect(r.err).toContain("cli.run");
    }
  });

  test("runCommand joins the prefix and the arguments", () => {
    expect(runCommand("specctx", "task start 1/1.1")).toBe("specctx task start 1/1.1");
    expect(runCommand("npx -y spec-ctx@0.4.0", "gate --strict")).toBe("npx -y spec-ctx@0.4.0 gate --strict");
  });
});
