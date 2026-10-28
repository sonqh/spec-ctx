// Test helpers. Every test project lives in a fresh temp dir. Nothing writes outside it.
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { main } from "../src/main.ts";

export const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
export const BASE_FIXTURE = join(REPO, "tests/fixtures/ctx-repo");
export const PARITY_FIXTURE = join(REPO, "tests/fixtures/parity-repo");
export const NO_ID_FIXTURE = join(REPO, "tests/fixtures/no-id-repo");
export const KEBAB_FIXTURE = join(REPO, "tests/fixtures/kebab-repo");
export const DUP_KEY_FIXTURE = join(REPO, "tests/fixtures/dup-key-repo");

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
    // init detects the OpenSpec version with npx (022/D3). Tests never hit the network, so the default
    // command stands in when a test did not set SPECCTX_OPENSPEC itself.
    const stub = args[0] === "init" && process.env.SPECCTX_OPENSPEC === undefined;
    if (stub) process.env.SPECCTX_OPENSPEC = "npx -y @fission-ai/openspec@latest";
    try {
      const code = await main(args, { cwd, out: (s) => (out += s), err: (s) => (err += s) });
      return { code, out, err };
    } finally {
      if (stub) delete process.env.SPECCTX_OPENSPEC;
    }
  }
  async build(): Promise<any> {
    const r = await this.run("build");
    if (r.code !== 0) throw new Error(`build failed: ${r.err}`);
    return JSON.parse(this.read(".ctx/index.json"));
  }
  /** Every file under the root with its bytes, for a byte-for-byte tree compare. */
  snapshot(): Map<string, string> {
    const out = new Map<string, string>();
    const walk = (abs: string, rel: string): void => {
      for (const n of readdirSync(abs).sort()) {
        const p = join(abs, n);
        const r = rel ? `${rel}/${n}` : n;
        if (statSync(p).isDirectory()) walk(p, r);
        else out.set(r, readFileSync(p).toString("base64"));
      }
    };
    walk(this.root, "");
    return out;
  }
  cleanup(): void {
    rmSync(this.tmp, { recursive: true, force: true });
  }
}
