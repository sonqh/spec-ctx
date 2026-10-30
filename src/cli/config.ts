// REQ-DIST-009 the one function that every command uses to read spec-ctx.toml (033/D4).
import { ConfigError, loadConfig, type Config } from "../config.ts";
import { UsageExit } from "./errors.ts";

/** Read the config. A config error becomes a usage error: one line on stderr and exit 2, never a stack. */
export function loadConfigOrExit(root: string): Config {
  try {
    return loadConfig(root);
  } catch (e) {
    if (e instanceof ConfigError) throw new UsageExit(e.message);
    throw e;
  }
}
