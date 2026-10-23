// Make dist/cli.js executable after tsc. Node APIs only.
import { chmodSync } from "node:fs";
chmodSync(new URL("../dist/cli.js", import.meta.url), 0o755);
