// REQ-IDX-014 the file system clock. A write gets its mtime from a coarse kernel clock, so two writes in one tick
// share an mtime. The index keeps the clock reading of the start of its build as its own mtime (049/D2).
import { closeSync, mkdirSync, openSync, statSync, unlinkSync, utimesSync } from "node:fs";
import { join } from "node:path";

/** Whole milliseconds of an mtime in nanoseconds. */
export function msOf(ns: bigint): number {
  return Number(ns / 1000000n);
}

/**
 * The time of the file system clock in whole milliseconds: create one file in `.ctx/`, stat it, delete it. When the
 * clock cannot be read, the value is one second before `Date.now()`. An earlier value can only cause an extra rebuild.
 */
export function fsNowMs(root: string): number {
  const dir = join(root, ".ctx");
  const f = join(dir, `.clock-${process.pid}`);
  try {
    mkdirSync(dir, { recursive: true });
    try {
      unlinkSync(f);
    } catch {
      // no old file
    }
    closeSync(openSync(f, "wx"));
    const ms = msOf(statSync(f, { bigint: true }).mtimeNs);
    try {
      unlinkSync(f);
    } catch {
      // the reading stays
    }
    return ms;
  } catch {
    return Date.now() - 1000;
  }
}

/** Set the mtime of a file to a whole number of milliseconds. Half a millisecond is added so that rounding keeps the value. */
export function setMtimeMs(path: string, ms: number): void {
  const t = (ms + 0.5) / 1000;
  utimesSync(path, t, t);
}

/** The mtime of a file in whole milliseconds, or null when it is absent. */
export function mtimeMsOf(path: string): number | null {
  try {
    return msOf(statSync(path, { bigint: true }).mtimeNs);
  } catch {
    return null;
  }
}

/** Sleep for a few milliseconds. The engine has no timer, so this blocks on a wait cell. */
export function pause(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
