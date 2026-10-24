// REQ-STAT-005 stats --write: docs/metrics/<YYYY-MM-DD>.md, overwritten on the same day. Task 005/2.2.
import type { Stats } from "./stats.ts";
import { UsageExit } from "../cli/errors.ts";

export function writeStats(_root: string, _s: Stats): string {
  throw new UsageExit("stats --write is not ready yet");
}
