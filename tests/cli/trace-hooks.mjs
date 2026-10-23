// Preload for the startup test. It records every module URL that Node loads.
import { appendFileSync } from "node:fs";
import { registerHooks } from "node:module";

registerHooks({
  load(url, context, nextLoad) {
    appendFileSync(process.env.SPECCTX_TRACE_FILE, url + "\n");
    return nextLoad(url, context);
  },
});
