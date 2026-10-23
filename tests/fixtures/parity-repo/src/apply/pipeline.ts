import { linkSync, readFileSync, rmSync, rmdirSync, statSync, symlinkSync, unlinkSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { isSecretName } from "../adapters/common.ts";
import { createAdapter, SUPPORTED_AGENTS } from "../adapters/registry.ts";
import type { AgentAdapter, AgentSettings, Artifact } from "../adapters/types.ts";
import { compile, type ResolvedCatalog } from "../ic/compile.ts";
import type { IntermediateConfig } from "../ic/types.ts";
import { agentrcHome, loadProfile, type LoadedProfile } from "../profile/load.ts";
import type { AgentId } from "../profile/schema.ts";
import type { ValidationIssue } from "../profile/validate.ts";
import { unifiedDiff } from "../util/diff.ts";
import { AgentrcError, EXIT } from "../util/errors.ts";
import { DIGEST_IGNORE, ensureDir, exists, isDir, readText, replaceDirAtomic, writeFileAtomic } from "../util/fs.ts";
import { AGENTRC_VERSION } from "../version.ts";
import { BackupSet, listSets, pruneSets, readManifest, backupsRoot, relInSet } from "./backup.ts";
import { lockPath, readLock, writeLock, type Lockfile } from "./lockfile.ts";
import {
  isCopy,
  materialize,
  materializeRemoval,
  ownedDigest,
  readCurrent,
  tablesOf,
  type LockArtifact,
} from "./materialize.ts";

export type Action = "create" | "update" | "unchanged" | "skip" | "remove";

export interface PlanItem {
  agent: string;
  path: string;
  action: Action;
  write: string;
  artifact?: Artifact;
  prev?: LockArtifact;
  current: string | null;
  next: string | null;
  note?: string;
}

export interface AgentState {
  id: AgentId;
  enabled: boolean;
  supported: boolean;
  installed: boolean;
  configDir: string | null;
  adapter: AgentAdapter | null;
  notice?: string;
}

export interface Env {
  home: string;
  env: NodeJS.ProcessEnv;
  /** --profile */
  profileFlag?: string;
  /** --agents */
  agents?: string[];
  /** Catalog for compile. 004 resolves it from the lockfile and cache. */
  catalog?: (loaded: LoadedProfile, agentrcHome: string) => { catalog: ResolvedCatalog; pins: Lockfile["catalog"] };
  which?: (bin: string) => string | null;
  /** Test seam: build adapters some other way, for example a mock that misbehaves. */
  createAdapter?: typeof createAdapter;
  /** Test seam for REQ-APPLY-008: replaces the atomic file write. */
  writeFile?: (path: string, content: string) => void;
}

export interface Plan {
  loaded: LoadedProfile;
  ic: IntermediateConfig;
  agentrcHome: string;
  agents: AgentState[];
  items: PlanItem[];
  warnings: ValidationIssue[];
  pins: Lockfile["catalog"];
  lock: Lockfile | null;
}

export function settingsOf(loaded: LoadedProfile): AgentSettings {
  const p = loaded.profile;
  return {
    autonomy: p.working_style.autonomy,
    verbosity: p.working_style.verbosity,
    sandbox: p.risk.sandbox,
    projectMcpAutoload: p.risk.project_mcp_autoload,
  };
}

function under(p: string, root: string): boolean {
  return p === root || p.startsWith(root.endsWith("/") ? root : root + "/");
}

// REQ-APPLY-009 refuse secret files and paths outside the adapter roots, before any read or write
export function guardArtifacts(adapter: AgentAdapter, artifacts: Artifact[]): void {
  const roots = adapter.roots();
  for (const a of artifacts) {
    if (isSecretName(basename(a.path))) {
      throw new AgentrcError(
        `refusing to touch ${a.path}: agentrc never reads or writes auth.json, credentials*, *.token, or .env files. Nothing was written.`,
        EXIT.writeFailure,
      );
    }
    if (!roots.some((r) => under(a.path, r))) {
      throw new AgentrcError(
        `refusing to write ${a.path}: the path is outside the ${adapter.id} config dir. Nothing was written.`,
        EXIT.writeFailure,
      );
    }
  }
}

function classify(current: string | null, next: string | null): Action {
  if (current === next) return "unchanged";
  if (current === null) return "create";
  if (next === null) return "remove";
  return "update";
}

export function resolveAgents(loaded: LoadedProfile, e: Env): AgentState[] {
  const p = loaded.profile;
  const filter = e.agents && e.agents.length ? new Set(e.agents) : null;
  if (filter) {
    for (const a of filter) {
      if (!["claude-code", "codex", "cursor", "gemini-cli"].includes(a)) {
        throw new AgentrcError(`unknown agent ${a}. Known agents: claude-code, codex, cursor, gemini-cli`, EXIT.usage);
      }
    }
  }
  const out: AgentState[] = [];
  for (const id of Object.keys(p.agents).sort() as AgentId[]) {
    const entry = p.agents[id]!;
    if (!entry.enabled) continue;
    if (filter && !filter.has(id)) continue;
    const adapter = (e.createAdapter ?? createAdapter)(id, {
      home: e.home,
      env: e.env,
      profileConfigDir: entry.config_dir,
      profileDigest: loaded.digest,
      settings: settingsOf(loaded),
      which: e.which,
    });
    if (!adapter) {
      out.push({ id, enabled: true, supported: false, installed: false, configDir: null, adapter: null, notice: `no ${id} adapter in this version` });
      continue;
    }
    const d = adapter.detect();
    out.push({
      id,
      enabled: true,
      supported: SUPPORTED_AGENTS.includes(id),
      installed: d.installed,
      configDir: d.configDir,
      adapter,
      // SCN-ADPT-003-2
      notice: d.installed ? undefined : `${id} is not installed (no binary on PATH and no ${d.configDir}). Skipped.`,
    });
  }
  return out;
}

// REQ-APPLY-001 compile, render, read, classify. Writes nothing.
export function makePlan(e: Env): Plan {
  const loaded = loadProfile({ flag: e.profileFlag, env: e.env, home: e.home });
  const home = agentrcHome({ env: e.env, home: e.home });
  const { catalog, pins } = e.catalog ? e.catalog(loaded, home) : { catalog: undefined, pins: [] };
  const agents = resolveAgents(loaded, e);
  const caps = Object.fromEntries(agents.filter((a) => a.adapter).map((a) => [a.id, a.adapter!.capabilities()]));
  const ic = compile(loaded.profile, catalog, { capabilities: caps });
  const lock = readLock(home);
  const items: PlanItem[] = [];
  for (const ag of agents) {
    if (!ag.adapter) {
      items.push({ agent: ag.id, path: "-", action: "skip", write: "-", current: null, next: null, note: ag.notice });
      continue;
    }
    const arts = [...ag.adapter.render(ic)].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    if (!ag.installed) {
      for (const a of arts) items.push({ agent: ag.id, path: a.path, action: "skip", write: a.write, artifact: a, current: null, next: null, note: ag.notice });
      continue;
    }
    guardArtifacts(ag.adapter, arts);
    const prevByPath = new Map((lock?.artifacts ?? []).filter((x) => x.agent === ag.id).map((x) => [x.path, x]));
    const seen = new Set<string>();
    for (const a of arts) {
      seen.add(a.path);
      const prev = prevByPath.get(a.path);
      const current = readCurrent(a);
      const next = materialize(a, current, prev);
      items.push({ agent: ag.id, path: a.path, action: classify(current, next), write: a.write, artifact: a, prev, current, next });
    }
    // artifacts from the last apply that this profile no longer renders
    for (const prev of prevByPath.values()) {
      if (seen.has(prev.path)) continue;
      if (isSecretName(basename(prev.path))) continue;
      const current = readCurrent(prev);
      const next = materializeRemoval(prev, current);
      items.push({ agent: ag.id, path: prev.path, action: classify(current, next), write: prev.write, prev, current, next });
    }
  }
  return { loaded, ic, agentrcHome: home, agents, items, warnings: loaded.warnings, pins: pins ?? [], lock };
}

// REQ-APPLY-002 one unified diff per changed artifact
export function itemDiff(it: PlanItem): string {
  if (it.action === "unchanged" || it.action === "skip") return "";
  const fmt = it.artifact?.format ?? it.prev?.format;
  const copy = it.artifact ? isCopy(it.artifact) : it.prev ? isCopy(it.prev) : false;
  if (copy || it.write === "symlink" || it.write === "hardlink") {
    const what = fmt === "dir" ? "directory" : it.write === "replace" ? "file" : it.write;
    if (it.action === "remove") return `${what} removed: ${it.path}\n`;
    const src = it.artifact?.content ?? "";
    return `${what} ${it.action === "create" ? "created" : "replaced"}: ${it.path} from ${src}\n`;
  }
  return unifiedDiff(it.current, it.next, it.path);
}

export interface ApplyResult {
  written: PlanItem[];
  failed: PlanItem | null;
  notWritten: PlanItem[];
  backup: string | null;
  error?: Error;
}

function writeItem(it: PlanItem, set: BackupSet, e: Env): void {
  const write = e.writeFile ?? writeFileAtomic;
  const existed = exists(it.path);
  if (existed) set.keep(it.path);
  if (it.next === null) {
    rmSync(it.path, { recursive: true, force: true });
    return;
  }
  set.createdDirs(ensureDir(dirname(it.path)));
  const a = it.artifact!;
  if (isCopy(a)) {
    // REQ-CLD-007 replace the whole directory on digest change
    const skip = (rel: string) => isSecretName(basename(rel));
    if (a.format === "dir") replaceDirAtomic(a.content, it.path, skip);
    else write(it.path, readFileSync(a.content, "utf8"));
    if (a.format === "dir") write(join(it.path, ".agentrc-generated"), `${a.digest ?? ""}\n`);
  } else if (a.write === "symlink") {
    if (existed) unlinkSync(it.path);
    symlinkSync(a.content, it.path);
  } else if (a.write === "hardlink") {
    if (existed) unlinkSync(it.path);
    linkSync(a.content, it.path);
  } else {
    write(it.path, it.next);
  }
  if (!existed) set.created(it.path);
}

// REQ-APPLY-005 lockfile entries for every applied artifact
function lockEntries(plan: Plan): LockArtifact[] {
  const out: LockArtifact[] = [];
  for (const it of plan.items) {
    if (!it.artifact || it.action === "skip") continue;
    const a = it.artifact;
    const base = {
      agent: it.agent,
      path: a.path,
      write: a.write,
      format: a.format,
      owned: a.owned,
      ...(a.json ? { json: a.json } : {}),
      ...(a.toml ? { toml: a.toml, tables: tablesOf(a) } : {}),
    };
    out.push({ ...base, digest: ownedDigest(base) ?? "" });
  }
  // keep entries of agents this run did not touch
  const touched = new Set(plan.agents.filter((a) => a.installed).map((a) => a.id as string));
  for (const prev of plan.lock?.artifacts ?? []) if (!touched.has(prev.agent)) out.push(prev);
  return out;
}

// REQ-APPLY-003, REQ-APPLY-006, REQ-APPLY-008
export function executePlan(plan: Plan, e: Env, now: Date): ApplyResult {
  const changes = plan.items.filter((i) => i.action !== "unchanged" && i.action !== "skip");
  const lockBefore = readText(lockPath(plan.agentrcHome));
  const result: ApplyResult = { written: [], failed: null, notWritten: [], backup: null };
  let set: BackupSet | null = null;
  if (changes.length) {
    set = new BackupSet(plan.agentrcHome, e.home, now, lockBefore);
    result.backup = set.manifest.id;
  }
  for (let i = 0; i < changes.length; i++) {
    const it = changes[i]!;
    try {
      writeItem(it, set!, e);
      result.written.push(it);
    } catch (err) {
      result.failed = it;
      result.notWritten = changes.slice(i);
      result.error = err as Error;
      return result; // SCN-APPLY-008-1 no lockfile on failure
    }
  }
  const adapters: Record<string, string> = {};
  for (const a of plan.agents) if (a.adapter && a.installed) adapters[a.id] = a.adapter.version;
  const prevAdapters = plan.lock?.adapters ?? {};
  for (const [k, v] of Object.entries(prevAdapters)) if (!(k in adapters) && !plan.agents.some((a) => a.id === k && a.installed)) adapters[k] = v;
  writeLock(plan.agentrcHome, {
    lockfile: 1,
    agentrc: AGENTRC_VERSION,
    profile_digest: plan.loaded.digest,
    catalog: plan.pins,
    adapters,
    artifacts: lockEntries(plan),
    backup: result.backup ?? plan.lock?.backup ?? null,
  });
  if (set && lockBefore === null) set.created(lockPath(plan.agentrcHome));
  pruneSets(plan.agentrcHome);
  return result;
}

// ---------------------------------------------------------------- status

export type DriftState = "ok" | "drifted" | "missing";

export interface StatusItem {
  agent: string;
  path: string;
  state: DriftState;
}

// REQ-APPLY-005 compare the lockfile with disk
export function driftStatus(agentrcHomeDir: string): { lock: Lockfile | null; items: StatusItem[] } {
  const lock = readLock(agentrcHomeDir);
  if (!lock) return { lock: null, items: [] };
  const items = lock.artifacts.map((a) => {
    const d = ownedDigest(a);
    const state: DriftState = d === null ? "missing" : d === a.digest ? "ok" : "drifted";
    return { agent: a.agent, path: a.path, state };
  });
  return { lock, items };
}

// ---------------------------------------------------------------- revert

export interface RevertResult {
  id: string;
  restored: string[];
  removed: string[];
}

// REQ-APPLY-007 restore a backup set and remove what that apply created
export function revert(agentrcHomeDir: string, home: string, to?: string): RevertResult {
  const sets = listSets(agentrcHomeDir);
  if (!sets.length) throw new AgentrcError("no backup set found. Nothing to revert.", EXIT.usage);
  const id = to ?? sets[sets.length - 1]!;
  const m = readManifest(agentrcHomeDir, id);
  if (!m) throw new AgentrcError(`no backup set ${id}. Sets: ${sets.join(", ")}`, EXIT.usage);
  const setDir = join(backupsRoot(agentrcHomeDir), id);
  const res: RevertResult = { id, restored: [], removed: [] };
  for (const p of m.created) {
    if (p === lockPath(agentrcHomeDir)) continue;
    if (exists(p)) {
      rmSync(p, { recursive: true, force: true });
      res.removed.push(p);
    }
  }
  for (const p of m.modified) {
    const src = join(setDir, "files", relInSet(home, p));
    if (!exists(src)) continue;
    if (isDir(src)) {
      replaceDirAtomic(src, p);
    } else {
      ensureDir(dirname(p));
      if (exists(p) && !statSync(p).isFile()) rmSync(p, { recursive: true, force: true });
      writeFileAtomic(p, readFileSync(src, "utf8"));
    }
    res.restored.push(p);
  }
  for (const d of [...m.createdDirs].sort((a, b) => b.length - a.length)) {
    try {
      rmdirSync(d);
      res.removed.push(d);
    } catch {
      // not empty or already gone
    }
  }
  const lp = lockPath(agentrcHomeDir);
  if (m.lockBefore === null) {
    if (exists(lp)) {
      rmSync(lp);
      res.removed.push(lp);
    }
  } else {
    writeFileAtomic(lp, m.lockBefore);
    res.restored.push(lp);
  }
  rmSync(setDir, { recursive: true, force: true });
  try {
    rmdirSync(backupsRoot(agentrcHomeDir));
  } catch {
    // other sets remain
  }
  return res;
}

export { DIGEST_IGNORE };
