// REQ-TASK-004 the clock. SPECCTX_NOW sets a fixed time for tests.

export function now(): Date {
  const fixed = process.env.SPECCTX_NOW;
  return fixed ? new Date(fixed) : new Date();
}

export function isoNow(): string {
  return now().toISOString();
}

/** REQ-STAT-005 the UTC date, so CI and a local run name a metrics file alike (033/D5). */
export function today(): string {
  return isoNow().slice(0, 10);
}
