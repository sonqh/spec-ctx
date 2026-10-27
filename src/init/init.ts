// REQ-DIST-002 REQ-SCH-003 REQ-SKL-002 specctx init: config file, schema bundle, skills.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ASSETS } from "../assets.generated.ts";
import { UsageExit } from "../cli/errors.ts";
import { CONFIG_FILE, INIT_TEXT } from "../config.ts";

export const SCHEMA = "spec-driven-ids";
export const SKILL_DIRS = [".claude/skills", ".agents/skills"];

export interface InitOpts {
  schema: boolean;
  skills: boolean;
  force: boolean;
}

export interface InitResult {
  written: string[];
  kept: string[];
  /** REQ-DIST-002 files that exist with other content and stay, because --force is absent */
  changed: string[];
  /** REQ-CLI-007 true when every file is present and equal */
  nothing?: boolean;
  notes: string[];
}

function asset(rel: string): Buffer {
  const b64 = ASSETS[rel];
  if (b64 === undefined) throw new Error(`asset ${rel} is missing from the package`);
  return Buffer.from(b64, "base64");
}

/** Target path relative to the project root for every file that init installs, with its bytes. */
export function plan(o: InitOpts): [string, Buffer][] {
  const out: [string, Buffer][] = [[CONFIG_FILE, Buffer.from(INIT_TEXT)]];
  for (const rel of Object.keys(ASSETS).sort()) {
    if (o.schema && rel.startsWith(`schemas/${SCHEMA}/`) && !rel.endsWith("/config-fragment.yaml")) {
      out.push([`openspec/${rel}`, asset(rel)]);
    }
    if (o.skills && rel.startsWith("skills/")) {
      for (const d of SKILL_DIRS) out.push([`${d}/${rel.slice("skills/".length)}`, asset(rel)]);
    }
  }
  return out;
}

const TOP_KEY = /^([A-Za-z_][\w-]*):/;

function topKeys(text: string): Set<string> {
  const keys = new Set<string>();
  for (const line of text.split("\n")) {
    const m = TOP_KEY.exec(line);
    if (m) keys.add(m[1]!);
  }
  return keys;
}

/** Top-level blocks of a YAML file, keyed by name, as raw text. Comment lines before a block stay out. */
function topBlocks(text: string): Map<string, string> {
  const blocks = new Map<string, string>();
  let key: string | null = null;
  let buf: string[] = [];
  const flush = (): void => {
    if (key) blocks.set(key, buf.join("\n").replace(/\n+$/, "") + "\n");
  };
  for (const line of text.split("\n")) {
    const m = TOP_KEY.exec(line);
    if (m) {
      flush();
      key = m[1]!;
      buf = [line];
    } else if (key && (line.startsWith(" ") || line.startsWith("\t") || line.trim() === "")) buf.push(line);
    else if (key && line.startsWith("#")) continue;
    else if (key) {
      flush();
      key = null;
    }
  }
  flush();
  return blocks;
}

/**
 * REQ-SCH-003 quote list items under `rules` and `operations` that hold `: ` and are not quoted.
 * YAML reads such an item as a one key mapping. Every other line stays byte for byte.
 */
export function repairItems(text: string): { text: string; fixed: number } {
  let inBlock = false;
  let fixed = 0;
  const out = text.split("\n").map((line) => {
    const top = TOP_KEY.exec(line);
    if (top) {
      inBlock = top[1] === "rules" || top[1] === "operations";
      return line;
    }
    if (!inBlock) return line;
    const m = /^(\s+- )(.*?)(\s*)$/.exec(line);
    if (!m || /^['"]/.test(m[2]!) || !/:(\s|$)/.test(m[2]!)) return line;
    fixed++;
    return `${m[1]}'${m[2]!.replace(/'/g, "''")}'${m[3]}`;
  });
  return { text: out.join("\n"), fixed };
}

/**
 * REQ-SCH-003 add each top-level key of the fragment that the project config lacks.
 * Keys that exist stay as they are. The schema key names the installed bundle.
 */
export function mergeConfig(current: string | null, fragment: string): { text: string; added: string[]; kept: string[] } {
  let text = current ?? "";
  const added: string[] = [];
  const kept: string[] = [];
  const schemaLine = `schema: ${SCHEMA}`;
  if (/^schema:.*$/m.test(text)) {
    if (!new RegExp(`^${schemaLine}\\s*$`, "m").test(text)) {
      text = text.replace(/^schema:.*$/m, schemaLine);
      added.push("schema");
    }
  } else {
    text = schemaLine + "\n" + (text ? "\n" + text : "");
    added.push("schema");
  }
  const have = topKeys(text);
  for (const [key, block] of topBlocks(fragment)) {
    if (have.has(key)) {
      kept.push(key);
      continue;
    }
    text = text.replace(/\n*$/, "\n\n") + block;
    added.push(key);
  }
  const r = repairItems(text);
  if (r.fixed) {
    text = r.text;
    added.push("repaired items");
  }
  return { text, added, kept };
}

export function runInit(root: string, o: InitOpts): InitResult {
  const res: InitResult = { written: [], kept: [], changed: [], notes: [] };
  let files = plan(o);
  // REQ-CLI-007 every file present with the same bytes and no config key to add: nothing to do
  // an existing spec-ctx.toml counts as present, because the user owns it (014/D4)
  const same = files.every(([rel, data]) => existsSync(join(root, rel)) && (rel === CONFIG_FILE || readFileSync(join(root, rel)).equals(data)));
  if (same && !o.force) {
    const cfgPath = join(root, "openspec/config.yaml");
    const cur = existsSync(cfgPath) ? readFileSync(cfgPath, "utf8") : null;
    if (!o.schema || !mergeConfig(cur, asset(`schemas/${SCHEMA}/config-fragment.yaml`).toString("utf8")).added.length) {
      res.nothing = true;
      return res;
    }
  }
  // REQ-DIST-002 init never replaces spec-ctx.toml, and never fails because a file exists (014/D1)
  if (existsSync(join(root, CONFIG_FILE))) {
    files = files.filter(([rel]) => rel !== CONFIG_FILE);
    res.kept.push(CONFIG_FILE);
  }
  if (!o.force) {
    const differs = (rel: string, data: Buffer): boolean => !readFileSync(join(root, rel)).equals(data);
    res.changed = files.filter(([rel, data]) => existsSync(join(root, rel)) && differs(rel, data)).map(([rel]) => rel);
    for (const rel of res.changed) res.kept.push(`${rel} (other content)`);
    files = files.filter(([rel]) => !existsSync(join(root, rel)));
  }
  for (const [rel, data] of files) {
    const p = join(root, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, data);
    res.written.push(rel);
  }
  if (o.schema) {
    const cfgPath = join(root, "openspec/config.yaml");
    const cur = existsSync(cfgPath) ? readFileSync(cfgPath, "utf8") : null;
    const m = mergeConfig(cur, asset(`schemas/${SCHEMA}/config-fragment.yaml`).toString("utf8"));
    if (m.added.length) {
      mkdirSync(dirname(cfgPath), { recursive: true });
      writeFileSync(cfgPath, m.text);
      res.written.push(`openspec/config.yaml (${m.added.join(", ")})`);
    }
    for (const k of m.kept) res.kept.push(`openspec/config.yaml ${k}`);
  }
  return res;
}
