import { join } from "node:path";
import { readText, writeFileAtomic, ensureDir } from "../util/fs.ts";
import type { LockArtifact } from "./materialize.ts";

// REQ-CAT-004 one pinned catalog item
export interface CatalogPin {
  /** The reference as written in the profile. */
  ref: string;
  kind: "skill" | "mcp" | "command";
  source: "cct" | "skills";
  name: string;
  resolved_ref: string;
  digest: string;
}

// REQ-APPLY-005 lockfile shape
export interface Lockfile {
  lockfile: 1;
  agentrc: string;
  profile_digest: string;
  catalog: CatalogPin[];
  adapters: Record<string, string>;
  artifacts: LockArtifact[];
  backup: string | null;
}

export function lockPath(agentrcHome: string): string {
  return join(agentrcHome, "agentrc.lock");
}

export function readLock(agentrcHome: string): Lockfile | null {
  const t = readText(lockPath(agentrcHome));
  if (t === null) return null;
  try {
    return JSON.parse(t) as Lockfile;
  } catch {
    return null;
  }
}

export function writeLock(agentrcHome: string, lock: Lockfile): void {
  ensureDir(agentrcHome);
  const sorted = { ...lock, artifacts: [...lock.artifacts].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)) };
  writeFileAtomic(lockPath(agentrcHome), JSON.stringify(sorted, null, 2) + "\n");
}
