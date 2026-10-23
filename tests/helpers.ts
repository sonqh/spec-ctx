// Test helpers. Every test project lives in a fresh temp dir. Nothing writes outside it.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { main } from "../src/main.ts";

export const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
export const BASE_FIXTURE = join(REPO, "tests/fixtures/ctx-repo");
export const PARITY_FIXTURE = join(REPO, "tests/fixtures/parity-repo");

/** Tag text built at run time, so the index of this repo does not read test data as tags. */
export const TAG = "// " + "REQ-";
export const COVERS = "Cov" + "ers: ";

export interface Run {
  code: number;
  out: string;
  err: string;
}

export class Project {
  readonly root: string;
  private tmp: string;
  constructor(from: string | null = BASE_FIXTURE) {
    this.tmp = mkdtempSync(join(tmpdir(), "specctx-test-"));
    this.root = join(this.tmp, "repo");
    if (from) cpSync(from, this.root, { recursive: true });
    else mkdirSync(this.root);
  }
  path(rel: string): string {
    return join(this.root, rel);
  }
  write(rel: string, text: string): void {
    const p = this.path(rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, text);
  }
  append(rel: string, text: string): void {
    this.write(rel, this.read(rel) + text);
  }
  read(rel: string): string {
    return readFileSync(this.path(rel), "utf8");
  }
  /** Move the mtime forward so the stale check sees the edit on any filesystem. */
  touchForward(rel: string, ms = 5000): void {
    const st = statSync(this.path(rel));
    utimesSync(this.path(rel), st.atime, new Date(st.mtimeMs + ms));
  }
  async run(...args: string[]): Promise<Run> {
    return this.runIn(this.root, ...args);
  }
  async runIn(cwd: string, ...args: string[]): Promise<Run> {
    let out = "";
    let err = "";
    const code = await main(args, { cwd, out: (s) => (out += s), err: (s) => (err += s) });
    return { code, out, err };
  }
  async build(): Promise<any> {
    const r = await this.run("build");
    if (r.code !== 0) throw new Error(`build failed: ${r.err}`);
    return JSON.parse(this.read(".ctx/index.json"));
  }
  cleanup(): void {
    rmSync(this.tmp, { recursive: true, force: true });
  }
}
