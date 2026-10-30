// REQ-QRY-005 REQ-QRY-008 REQ-QRY-011 turn the input of related or bundle into a change or a repository path.
import { realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type { Entry } from "../index/types.ts";
import { changeKey, resolveChange } from "../index/scan.ts";

export type FileInput = { rel: string } | { error: string };

const ID_SHAPE = /^(?:(?:REQ|SCN)-[A-Z]{2,6}-\d{3}(?:-\d+)?|ADR-\d{3}|[^/\s]+\/(?:\d+\.\d+|D\d+)|(?:change|cap)\/[^/\s]+)$/;

/**
 * REQ-QRY-011 a change key or a folder name that is no ID resolves to `change/<key>`.
 * The caller runs this after the ID check and before the path rule (046/D8).
 */
export function changeInput(entries: Entry[], input: string): string | undefined {
  const folder = resolveChange(entries, input);
  if (folder === undefined) return undefined;
  const id = `change/${changeKey(folder)}`;
  return entries.some((e) => e.id === id) ? id : undefined;
}

/** An input that looks like an ID. When it is no file, the error is `unknown id`. */
export const idShaped = (input: string): boolean => ID_SHAPE.test(input);

function real(p: string): string | null {
  try {
    return realpathSync(p);
  } catch {
    return null;
  }
}

/** REQ-QRY-008 the path against the root, then against the working directory. The result is a file inside the root. */
export function resolveFileInput(root: string, cwd: string, input: string): FileInput {
  const realRoot = real(root) ?? root;
  const tries = isAbsolute(input) ? [input] : [resolve(root, input), resolve(cwd, input)];
  let found: string | null = null;
  for (const t of tries) {
    const r = real(t);
    if (r !== null) {
      found = r;
      break;
    }
  }
  if (found === null) return idShaped(input) ? { error: `unknown id ${input}` } : { error: `no such file: ${input}` };
  const rel = relative(realRoot, found);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return { error: `outside the repository: ${input}` };
  let isFile = false;
  try {
    isFile = statSync(found).isFile();
  } catch {
    isFile = false;
  }
  if (!isFile) return idShaped(input) ? { error: `unknown id ${input}` } : { error: `not a file: ${input}` };
  return { rel: rel.split(sep).join("/") };
}
