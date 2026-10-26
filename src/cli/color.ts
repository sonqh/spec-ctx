// REQ-CLI-008 color on a TTY. Without color the bytes equal the plain output.

export type PaintKind = "ok" | "fail" | "dim";

const CODES: Record<PaintKind, string> = { ok: "\x1b[32m", fail: "\x1b[31m", dim: "\x1b[2m" };
const RESET = "\x1b[0m";

/**
 * Color is on when `FORCE_COLOR` is set, or when stdout is a TTY and `TERM` is not `dumb`.
 * `NO_COLOR` wins over both. An empty value counts as unset. `FORCE_COLOR=0` counts as unset.
 */
export function colorOn(tty: boolean, env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NO_COLOR) return false;
  const force = env.FORCE_COLOR;
  if (force && force !== "0" && force !== "false") return true;
  return tty && env.TERM !== "dumb";
}

/** Wrap one line of text in the code of its kind. A trailing newline stays outside the codes. */
export function paint(kind: PaintKind, text: string, tty: boolean | undefined): string {
  if (!colorOn(tty === true)) return text;
  const nl = text.endsWith("\n") ? "\n" : "";
  const body = nl ? text.slice(0, -1) : text;
  return `${CODES[kind]}${body}${RESET}${nl}`;
}
