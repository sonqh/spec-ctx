// REQ-VER-001 REQ-VER-003 run a Verify command with sh -c in the project root, with a timeout.
import { spawn } from "node:child_process";

export interface RunResult {
  exit: number | null;
  timedOut: boolean;
  stdout: Buffer;
  stderr: Buffer;
  /** stdout and stderr in arrival order */
  output: string;
}

export const TAIL_LINES = 20;

export function tail(text: string, n = TAIL_LINES): string {
  const lines = text.replace(/\n$/, "").split("\n");
  return text === "" ? "" : lines.slice(-n).join("\n");
}

export function runVerify(command: string, cwd: string, timeoutS: number): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    // a new process group, so the timeout stops the children of sh too
    const child = spawn("sh", ["-c", command], { cwd, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let output = "";
    let timedOut = false;
    child.stdout.on("data", (b: Buffer) => {
      out.push(b);
      output += b.toString("utf8");
    });
    child.stderr.on("data", (b: Buffer) => {
      err.push(b);
      output += b.toString("utf8");
    });
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid!, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    }, timeoutS * 1000);
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ exit: timedOut ? null : code, timedOut, stdout: Buffer.concat(out), stderr: Buffer.concat(err), output });
    });
  });
}
