// REQ-QRY-023 REQ-QRY-024 REQ-QRY-025 the trust labels of a card: the provenance class and the evidence state.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Entry } from "../index/types.ts";
import { staleOf } from "../check/evidence.ts";
import { evidenceRel } from "../tasks/tasks.ts";
import { fileSha256 } from "../util/hash.ts";

/** REQ-QRY-023 the closed set of provenance classes */
export type Provenance = "declared" | "tagged" | "structural" | "verified";

const TAGGED = ["implements", "covers", "tag at"];
const STRUCTURAL = ["delta in", "design named in", "task names", "capability of", "requirement in", "capability touched by", "main version of"];

/** REQ-QRY-023 the class of a reason, by its prefix (062/D1). An unknown prefix is declared. */
export function provenanceClass(reason: string): Exclude<Provenance, "verified"> {
  if (TAGGED.some((p) => reason.startsWith(p))) return "tagged";
  if (STRUCTURAL.some((p) => reason.startsWith(p))) return "structural";
  return "declared";
}

/** REQ-QRY-024 the evidence state of a task */
export type TaskState = "fresh" | `stale since ${string}` | "no evidence";

interface Evidence {
  files: Record<string, string>;
}

/**
 * The trust state of one bundle run. It reads each evidence file at most once and hashes each file at most once
 * (062/D3). It writes nothing.
 */
export class Trust {
  private readonly tasks = new Map<string, Entry>();
  private readonly citedBy = new Map<string, string[]>();
  private readonly states = new Map<string, TaskState>();
  private readonly evidence = new Map<string, Evidence | null>();
  private readonly hashes = new Map<string, string | null>();

  private readonly root: string;

  constructor(root: string, entries: Entry[]) {
    this.root = root;
    for (const e of entries) {
      if (e.kind !== "task") continue;
      // an active copy wins over an archived one, as check does
      const cur = this.tasks.get(e.id);
      if (!cur || (cur.file.includes("/archive/") && !e.file.includes("/archive/"))) this.tasks.set(e.id, e);
    }
    for (const t of this.tasks.values()) {
      for (const r of t.refs) {
        const l = this.citedBy.get(r) ?? [];
        l.push(t.id);
        this.citedBy.set(r, l);
      }
    }
  }

  /** REQ-QRY-028 the tasks that cite a requirement, from the deduped map (068/D2) */
  citing(req: string): Entry[] {
    return (this.citedBy.get(req) ?? []).map((id) => this.tasks.get(id)!);
  }

  /** REQ-QRY-028 the task that an ID names, an active copy before an archived one */
  task(id: string): Entry | undefined {
    return this.tasks.get(id);
  }

  private readEvidence(task: string): Evidence | null {
    if (this.evidence.has(task)) return this.evidence.get(task)!;
    const p = join(this.root, evidenceRel({ id: task }));
    let ev: Evidence | null = null;
    if (existsSync(p)) {
      try {
        const j = JSON.parse(readFileSync(p, "utf8")) as { files?: Record<string, string> };
        ev = { files: j.files ?? {} };
      } catch {
        ev = null;
      }
    }
    this.evidence.set(task, ev);
    return ev;
  }

  private hash(path: string): string | null {
    if (!this.hashes.has(path)) this.hashes.set(path, fileSha256(join(this.root, path)));
    return this.hashes.get(path)!;
  }

  /** REQ-QRY-024 fresh, stale since the first stale path, or no evidence (062/D2). Never the word current. */
  taskState(id: string): TaskState {
    if (this.states.has(id)) return this.states.get(id)!;
    const t = this.tasks.get(id);
    let s: TaskState = "no evidence";
    if (t && t.status === "done" && existsSync(join(this.root, evidenceRel({ id })))) {
      // a damaged file is stale as a whole, as check reports it, so the decision rests on the file and not on the parse
      if (t.file.includes("/archive/")) s = "fresh";
      else {
        const stale = staleOf(this.root, id);
        s = stale ? `stale since ${stale}` : "fresh";
      }
    }
    this.states.set(id, s);
    return s;
  }

  /** REQ-QRY-025 verified when one citing task is fresh, with an early stop (062/D3) */
  reqState(id: string): "verified" | "unverified" {
    for (const t of this.citedBy.get(id) ?? []) if (this.taskState(t) === "fresh") return "verified";
    return "unverified";
  }

  /**
   * REQ-QRY-023 a tagged line is verified when a done task that cites its requirement lists the file in its
   * evidence with the current hash (062/D1a). An archived task counts too, so a changed line never reads verified.
   */
  lineVerified(file: string, req: string): boolean {
    for (const t of this.citedBy.get(req) ?? []) {
      const task = this.tasks.get(t);
      if (!task || task.status !== "done") continue;
      const ev = this.readEvidence(t);
      const want = ev?.files[file];
      if (want && this.hash(file) === want) return true;
    }
    return false;
  }
}

/** REQ-QRY-023 the requirement that a tagged reason names, or null */
export function taggedReq(reason: string): string | null {
  const m = /^(?:implements|covers) (\S+)/.exec(reason);
  return m ? m[1]! : null;
}
