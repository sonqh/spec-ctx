// REQ-IDX-002 record shape of .ctx/index.json.

export type Kind = "req" | "scn" | "adr" | "decision" | "task" | "code" | "test";
export type Status = "active" | "modified" | "removed" | "archived" | "done" | "open";

export interface Entry {
  id: string;
  kind: Kind;
  file: string;
  line: number;
  title: string;
  text: string;
  change: string;
  status: Status;
  canonical: boolean;
  refs: string[];
  scenarios?: string[];
  /** REQ-IDX-009 paths that an active task line names in backticks. */
  paths?: string[];
}

/** file, line, rule, detail */
export type Problem = [string, number, string, string];

export interface Scanned {
  count: number;
  newest_mtime_ms: number;
}

export interface Index {
  entries: Entry[];
  problems: Problem[];
  scanned: Scanned;
  scn_named: string[];
}
