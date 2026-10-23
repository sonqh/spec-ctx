// REQ-TASK-004 sha256 hex digests.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export function sha256(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

export function fileSha256(path: string): string | null {
  try {
    return sha256(readFileSync(path));
  } catch {
    return null;
  }
}
