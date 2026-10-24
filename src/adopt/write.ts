// REQ-ADOPT-002 the adopt write. Task 004/2.3 implements it.
import type { Config } from "../config.ts";
import type { Io } from "../main.ts";
import { UsageExit } from "../cli/errors.ts";
import type { Plan } from "./plan.ts";

export async function applyAdopt(_root: string, _cfg: Config, _plan: Plan, _io: Io, _json: boolean): Promise<number> {
  throw new UsageExit("adopt without --dry-run is not ready yet. Use adopt --dry-run");
}
