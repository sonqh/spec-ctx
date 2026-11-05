// REQ-JRN-003 every test run starts with the journal off, so a spawned CLI never writes under this repo.
// A test that needs the journal passes SPECCTX_JOURNAL=1 in its own env, under a temp dir.
process.env.SPECCTX_JOURNAL = "0";
