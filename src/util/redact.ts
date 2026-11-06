// REQ-TASK-008 machine paths out of evidence (056/D5). Windows paths are out of scope: Verify runs through sh.
import { realpathSync } from "node:fs";
import { homedir } from "node:os";

const WORD = /[A-Za-z0-9._-]/;

function trimSlash(p: string): string {
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}

function realOf(root: string): string | null {
  try {
    return realpathSync(root);
  } catch {
    return null;
  }
}

/** The home directory: HOME at call time when set, else the OS answer. Bun caches homedir(), so HOME goes first. */
function homeNow(): string {
  return process.env.HOME || homedir();
}

/**
 * REQ-TASK-008 replace the project root and its real path with `.`, and the home directory with `~`. The longest path
 * goes first, and the root wins a tie. A match needs a start of text or a non word character before it and a non word
 * character or the end after it. A root or home of `/` or the empty string is skipped. `real` defaults to the real path
 * of `root`, so a test can pin the macOS `/tmp` case.
 */
export function redactPaths(text: string, root: string, home: string = homeNow(), real: string | null = realOf(root)): string {
  const pairs: [string, string][] = [];
  const add = (from: string | null, to: string): void => {
    if (from === null) return;
    const p = trimSlash(from);
    if (p === "" || p === "/" || pairs.some(([f]) => f === p)) return;
    pairs.push([p, to]);
  };
  add(root, ".");
  add(real, ".");
  add(home, "~");
  if (!pairs.length || text === "") return text;
  // the longest path first, the root before the home on a tie (a stable sort keeps the push order)
  pairs.sort((a, b) => b[0].length - a[0].length);
  let out = "";
  let i = 0;
  while (i < text.length) {
    const hit = pairs.find(([from]) => text.startsWith(from, i) && (i === 0 || !WORD.test(text[i - 1]!)) && (i + from.length === text.length || !WORD.test(text[i + from.length]!)));
    if (hit) {
      out += hit[1];
      i += hit[0].length;
    } else {
      out += text[i];
      i++;
    }
  }
  return out;
}
