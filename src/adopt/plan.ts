// REQ-ADOPT-001 REQ-ADOPT-004 the adopt plan: which header gets which ID. It reads files and writes nothing.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { UsageExit } from "../cli/errors.ts";
import type { Config } from "../config.ts";
import { retiredAll } from "../ids/ids.ts";
import { cmpStr, splitLines } from "../util/pystr.ts";

const REQ_HDR = /^### Requirement:[ \t]*(.*)$/s;
const SCN_HDR = /^#### Scenario:[ \t]*(.*)$/s;
const HAS_REQ = /^REQ-([A-Z]{2,6})-(\d{3})(?:[ \t]|$)/;
const HAS_SCN = /^SCN-([A-Z]{2,6})-(\d{3})-(\d+)(?:[ \t]|$)/;
// REQ-ADOPT-010 an ID in square brackets, the form of OpenSpec PR #1979 (027/D3)
const BR_REQ = /^\[(REQ-[A-Z]{2,6}-\d{3})\](?:[ \t]|$)/;
const BR_SCN = /^\[(SCN-[A-Z]{2,6}-\d{3}-\d+)\](?:[ \t]|$)/;
const RENAME = /^- (FROM|TO):[ \t]*`### Requirement:[ \t]*(.*)`[ \t]*$/s;

export interface Edit {
  file: string;
  line: number;
  old: string;
  new: string;
}

export interface Plan {
  edits: Edit[];
  caps: { code: string; path: string; derived: boolean }[];
  unmatched: { file: string; line: number; header: string }[];
}

interface Block {
  kind: "req" | "scn";
  line: number;
  raw: string;
  /** header text after the keyword, without an ID */
  name: string;
  id: string | null;
  /** the existing ID sits in square brackets */
  bracketed: boolean;
  req?: Block;
  section: string;
}

interface RenameItem {
  line: number;
  name: string;
  id: string | null;
  bracketed: boolean;
  raw: string;
}

interface SpecFile {
  rel: string;
  cap: string;
  lines: string[];
  blocks: Block[];
  renames: { from: RenameItem; to: RenameItem }[];
}

function listSpecs(root: string, base: string): string[] {
  const out: string[] = [];
  const walk = (abs: string, rel: string): void => {
    if (!existsSync(abs)) return;
    for (const n of readdirSync(abs).sort(cmpStr)) {
      const p = join(abs, n);
      const r = `${rel}/${n}`;
      if (statSync(p).isDirectory()) walk(p, r);
      else if (n === "spec.md") out.push(r);
    }
  };
  walk(join(root, base), base);
  return out;
}

/** REQ-ADOPT-010 the ID at the start of a header text, bare or in square brackets, and the name after it. */
function splitId(text: string, re: RegExp, br: RegExp): { id: string | null; name: string; bracketed: boolean } {
  const m = re.exec(text);
  if (m) return { id: m[0].trim(), name: text.slice(m[0].length).trim(), bracketed: false };
  const b = br.exec(text);
  if (b) return { id: b[1]!, name: text.slice(b[0].length).trim(), bracketed: true };
  return { id: null, name: text.trim(), bracketed: false };
}

function parse(root: string, rel: string, cap: string): SpecFile {
  const lines = splitLines(readFileSync(join(root, rel)).toString("utf8"));
  const blocks: Block[] = [];
  const renames: SpecFile["renames"] = [];
  let section = "";
  let fence = false;
  let req: Block | undefined;
  let from: RenameItem | null = null;
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith("```") || t.startsWith("~~~")) fence = !fence;
    if (fence) return;
    if (line.startsWith("## ")) {
      section = line.slice(3).trim().split(" ")[0]!.toUpperCase();
      return;
    }
    let m = REQ_HDR.exec(line);
    if (m) {
      const { id, name, bracketed } = splitId(m[1]!, HAS_REQ, BR_REQ);
      req = { kind: "req", line: i + 1, raw: line, name, id, bracketed, section };
      blocks.push(req);
      return;
    }
    m = SCN_HDR.exec(line);
    if (m) {
      const { id, name, bracketed } = splitId(m[1]!, HAS_SCN, BR_SCN);
      blocks.push({ kind: "scn", line: i + 1, raw: line, name, id, bracketed, req, section });
      return;
    }
    m = RENAME.exec(line);
    if (m && section === "RENAMED") {
      const { id, name, bracketed } = splitId(m[2]!, HAS_REQ, BR_REQ);
      const item = { line: i + 1, name, id, bracketed, raw: line };
      if (m[1] === "FROM") from = item;
      else if (from) {
        renames.push({ from, to: item });
        from = null;
      }
    }
  });
  return { rel, cap, lines, blocks, renames };
}

/** REQ-ADOPT-004 candidate codes in order: the base code, then two and three letters of the first segment, then a suffix letter. */
export function codeCandidates(path: string): string[] {
  const segs = path.split(/[/-]/).map((x) => x.toUpperCase().replace(/[^A-Z]/g, "")).filter(Boolean);
  if (!segs.length) return [];
  const rest = segs.slice(1).map((x) => x[0]!).join("");
  const base = segs.length === 1 ? segs[0]!.slice(0, 3) : segs.map((x) => x[0]!).join("").slice(0, 6);
  const out = [base, (segs[0]!.slice(0, 2) + rest).slice(0, 6), (segs[0]!.slice(0, 3) + rest).slice(0, 6)];
  for (let c = 66; c <= 90; c++) out.push((base.slice(0, 5) + String.fromCharCode(c)));
  return [...new Set(out.filter((x) => /^[A-Z]{2,6}$/.test(x)))];
}

export function deriveCode(path: string, taken: Set<string> = new Set()): string {
  const code = codeCandidates(path).find((c) => !taken.has(c));
  if (!code) throw new UsageExit(`no free capability code for ${path}. Add one under [ids.paths] in spec-ctx.toml`);
  return code;
}

export function planAdopt(root: string, cfg: Config): Plan {
  const mains = listSpecs(root, "openspec/specs");
  const changesDir = join(root, "openspec/changes");
  const deltas: string[] = [];
  if (existsSync(changesDir)) {
    for (const c of readdirSync(changesDir).sort(cmpStr)) {
      if (c === "archive" || !statSync(join(changesDir, c)).isDirectory()) continue;
      deltas.push(...listSpecs(root, `openspec/changes/${c}/specs`));
    }
  }
  const capOf = (rel: string): string => rel.replace(/^openspec\/(changes\/[^/]+\/)?specs\//, "").replace(/\/spec\.md$/, "");
  const files = [...mains, ...deltas].map((r) => parse(root, r, capOf(r)));
  const mainFiles = files.filter((f) => f.rel.startsWith("openspec/specs/"));
  const deltaFiles = files.filter((f) => !f.rel.startsWith("openspec/specs/"));

  // the code of each capability: config paths, then an ID already in its spec, then derived
  const paths = cfg.ids.paths ?? {};
  const codeOfPath = new Map<string, string>();
  for (const [code, p] of Object.entries(paths)) codeOfPath.set(p, code);
  // on a collision the shorter path keeps the base code: user-auth keeps UA, upload-api takes UPA
  const capList = [...new Set(files.map((f) => f.cap))].sort((a, b) => a.length - b.length || cmpStr(a, b));
  const taken = new Set<string>([...cfg.ids.caps, ...codeOfPath.values()]);
  const caps: Plan["caps"] = [];
  for (const cap of capList) {
    let code = codeOfPath.get(cap);
    let derived = false;
    if (!code) {
      const existing = files.filter((f) => f.cap === cap).flatMap((f) => f.blocks).find((b) => b.kind === "req" && b.id);
      if (existing) code = HAS_REQ.exec(existing.id!)![1]!;
    }
    if (!code) {
      code = deriveCode(cap, taken);
      derived = true;
      taken.add(code);
    }
    caps.push({ code, path: cap, derived });
  }
  caps.sort((a, b) => cmpStr(a.path, b.path));
  const codeFor = new Map(caps.map((c) => [c.path, c.code]));

  // next free number per code: every ID in the tree, the archive, and the retired list
  const used = new Map<string, number>();
  const bump = (code: string, n: number): void => {
    used.set(code, Math.max(used.get(code) ?? 0, n));
  };
  const allIds: string[] = [...retiredAll(root)];
  for (const f of files) for (const b of f.blocks) if (b.id) allIds.push(b.id);
  const archive = join(root, "openspec/changes/archive");
  if (existsSync(archive)) {
    const walk = (abs: string): void => {
      for (const n of readdirSync(abs)) {
        const p = join(abs, n);
        if (statSync(p).isDirectory()) walk(p);
        else if (n.endsWith(".md")) for (const m of readFileSync(p, "utf8").matchAll(/\bREQ-([A-Z]{2,6})-(\d{3})\b/g)) allIds.push(m[0]);
      }
    };
    walk(archive);
  }
  for (const id of allIds) {
    const m = /^REQ-([A-Z]{2,6})-(\d{3})$/.exec(id);
    if (m) bump(m[1]!, Number(m[2]));
  }
  const nextReq = (code: string): string => {
    const n = (used.get(code) ?? 0) + 1;
    if (n > 999) throw new UsageExit(`no free REQ number for ${code}`);
    used.set(code, n);
    return `REQ-${code}-${String(n).padStart(3, "0")}`;
  };
  const scnUsed = new Map<string, number>();
  for (const f of files) for (const b of f.blocks) {
    if (b.kind === "scn" && b.id) {
      const m = HAS_SCN.exec(b.id + " ")!;
      const key = `REQ-${m[1]}-${m[2]}`;
      scnUsed.set(key, Math.max(scnUsed.get(key) ?? 0, Number(m[3])));
    }
  }
  const nextScn = (reqId: string): string => {
    const n = (scnUsed.get(reqId) ?? 0) + 1;
    scnUsed.set(reqId, n);
    return `SCN-${reqId.slice(4)}-${n}`;
  };

  const edits: Edit[] = [];
  const unmatched: Plan["unmatched"] = [];
  // REQ-ADOPT-010 the configured form of a new ID: bare, or in square brackets (027/D3)
  const form = (id: string, br = cfg.ids.brackets): string => (br ? `[${id}]` : id);
  const reqHeader = (id: string, name: string, br?: boolean): string => `### Requirement: ${form(id, br)} ${name}`;
  const scnHeader = (id: string, name: string): string => `#### Scenario: ${form(id)} ${name}`;
  // main spec: requirement id by name, and scenario id by requirement and name
  const mainReq = new Map<string, string>();
  const mainScn = new Map<string, string>();
  // the form of each main header after adopt: its own form when it had an ID, else the configured form
  const mainBr = new Map<string, boolean>();
  for (const f of mainFiles) {
    const code = codeFor.get(f.cap)!;
    const seen = new Set<string>();
    for (const b of f.blocks) {
      if (b.kind !== "req") continue;
      if (seen.has(b.name)) throw new UsageExit(`${f.rel}:${b.line} repeats the header "${b.name}". Give one of the two requirements another name, then run adopt again`);
      seen.add(b.name);
    }
    for (const b of f.blocks) {
      if (b.kind === "req") {
        const id = b.id ?? nextReq(code);
        if (!b.id) edits.push({ file: f.rel, line: b.line, old: b.raw, new: reqHeader(id, b.name) });
        mainReq.set(`${f.cap}\u0000${b.name}`, id);
        mainBr.set(`${f.cap}\u0000${b.name}`, b.id ? b.bracketed : cfg.ids.brackets);
        b.id = id;
      } else if (b.req?.id) {
        const id = b.id ?? nextScn(b.req.id);
        if (!b.id) edits.push({ file: f.rel, line: b.line, old: b.raw, new: scnHeader(id, b.name) });
        mainScn.set(`${b.req.id}\u0000${b.name}`, id);
        b.id = id;
      }
    }
  }
  // deltas: the same ID as the main header, through text match or the RENAMED mapping
  for (const f of deltaFiles) {
    const code = codeFor.get(f.cap)!;
    const renamedTo = new Map<string, string>();
    for (const r of f.renames) {
      const id = r.from.id ?? mainReq.get(`${f.cap}\u0000${r.from.name}`) ?? null;
      if (!id) {
        unmatched.push({ file: f.rel, line: r.from.line, header: r.from.raw });
        continue;
      }
      renamedTo.set(r.to.name, id);
      // REQ-ADOPT-010 the FROM line names the main header, so it takes the form of that header (027/D3)
      if (!r.from.id) edits.push({ file: f.rel, line: r.from.line, old: r.from.raw, new: `- FROM: \`${reqHeader(id, r.from.name, mainBr.get(`${f.cap}\u0000${r.from.name}`))}\`` });
      if (!r.to.id) edits.push({ file: f.rel, line: r.to.line, old: r.to.raw, new: `- TO: \`${reqHeader(id, r.to.name)}\`` });
    }
    for (const b of f.blocks) {
      if (b.kind === "req") {
        if (b.id) continue;
        let id: string | null = null;
        if (b.section === "ADDED") id = nextReq(code);
        else id = renamedTo.get(b.name) ?? mainReq.get(`${f.cap}\u0000${b.name}`) ?? null;
        if (!id) {
          unmatched.push({ file: f.rel, line: b.line, header: b.raw });
          continue;
        }
        edits.push({ file: f.rel, line: b.line, old: b.raw, new: reqHeader(id, b.name) });
        b.id = id;
      } else {
        if (b.id || !b.req?.id) continue;
        const id = mainScn.get(`${b.req.id}\u0000${b.name}`) ?? nextScn(b.req.id);
        edits.push({ file: f.rel, line: b.line, old: b.raw, new: scnHeader(id, b.name) });
        b.id = id;
      }
    }
  }
  edits.sort((a, b) => cmpStr(a.file, b.file) || a.line - b.line);
  return { edits, caps, unmatched };
}

export function planLines(p: Plan): string[] {
  const out = p.edits.map((e) => `${e.file}:${e.line}  ${e.old}  ->  ${e.new}`);
  const derived = p.caps.filter((c) => c.derived);
  if (derived.length) out.push(...derived.map((c) => `cap: ${c.code} ${c.path}`));
  for (const u of p.unmatched) out.push(`unmatched: ${u.file}:${u.line}  ${u.header}`);
  return out;
}
