// REQ-DIST-002 REQ-SCH-003 REQ-SKL-002 specctx init: config file, schema bundle, skills.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
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

/**
 * REQ-DIST-002 the config text for one project (017/D4). `tests/**` becomes `test/**` when only `test/`
 * exists at the root. `src/**` becomes `lib/**` when only `lib/` exists. The comments stay.
 */
export function configText(root: string): string {
  const isDir = (d: string): boolean => existsSync(join(root, d)) && statSync(join(root, d)).isDirectory();
  let text = INIT_TEXT;
  if (!isDir("tests") && isDir("test")) text = text.replace('\ntests = ["tests/**"]\n', '\ntests = ["test/**"]\n');
  if (!isDir("src") && isDir("lib")) text = text.replace('\ncode = ["src/**"]\n', '\ncode = ["lib/**"]\n');
  return text;
}

/** Target path relative to the project root for every file that init installs, with its bytes. */
export function plan(o: InitOpts, root: string): [string, Buffer][] {
  const out: [string, Buffer][] = [[CONFIG_FILE, Buffer.from(configText(root))]];
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

/** REQ-DIST-002 the two lines init owns in .gitignore (017/D2). */
export const GITIGNORE_LINES = [".ctx/index.json", "adopt-report.md"];
const GITIGNORE = ".gitignore";

/** The lines of a .gitignore, trimmed, with a leading slash dropped, so `/x` and `x` compare equal. */
function ignoreLines(text: string): Set<string> {
  return new Set(text.split(/\r?\n/).map((l) => l.trim().replace(/^\//, "")));
}

/**
 * REQ-DIST-002 add the absent lines under a `# spec-ctx` comment. Create the file when it is missing.
 * Returns the number of lines added, 0 when both are present.
 */
export function writeGitignore(root: string): number {
  const p = join(root, GITIGNORE);
  const cur = existsSync(p) ? readFileSync(p, "utf8") : null;
  const have = cur === null ? new Set<string>() : ignoreLines(cur);
  const add = GITIGNORE_LINES.filter((l) => !have.has(l));
  if (!add.length) return 0;
  const block = `# spec-ctx\n${add.join("\n")}\n`;
  let text: string;
  if (cur === null || cur === "") text = block;
  else text = cur.replace(/\n*$/, "\n") + "\n" + block;
  writeFileSync(p, text);
  return add.length;
}

/** REQ-DIST-002 true when .gitignore has a line that ignores the whole .claude directory (017/D3). */
export function ignoresClaude(root: string): boolean {
  const p = join(root, GITIGNORE);
  if (!existsSync(p)) return false;
  const lines = ignoreLines(readFileSync(p, "utf8"));
  return lines.has(".claude") || lines.has(".claude/");
}

/** REQ-SCH-003 where the templates with the ID placeholders are. Printed after the schema step (018/D5). */
export const TEMPLATES_NOTE = `templates: openspec/schemas/${SCHEMA}/templates/ (spec.md, tasks.md hold the ID placeholders)`;

export const CLAUDE_NOTE = "note: .gitignore ignores .claude/. The skills under .claude/skills/ stay out of git. The copies under .agents/skills/ are tracked.";

export function runInit(root: string, o: InitOpts): InitResult {
  const res: InitResult = { written: [], kept: [], changed: [], notes: [] };
  let files = plan(o, root);
  // REQ-CLI-007 every file present with the same bytes and no config key to add: nothing to do
  // an existing spec-ctx.toml counts as present, because the user owns it (014/D4)
  const same = files.every(([rel, data]) => existsSync(join(root, rel)) && (rel === CONFIG_FILE || readFileSync(join(root, rel)).equals(data)));
  const ignoreDone = existsSync(join(root, GITIGNORE)) && GITIGNORE_LINES.every((l) => ignoreLines(readFileSync(join(root, GITIGNORE), "utf8")).has(l));
  if (same && ignoreDone && !o.force) {
    const cfgPath = join(root, "openspec/config.yaml");
    const cur = existsSync(cfgPath) ? readFileSync(cfgPath, "utf8") : null;
    if (!o.schema || !mergeConfig(cur, asset(`schemas/${SCHEMA}/config-fragment.yaml`).toString("utf8")).added.length) {
      res.nothing = true;
      if (o.skills && ignoresClaude(root)) res.notes.push(CLAUDE_NOTE);
      if (o.schema) res.notes.push(TEMPLATES_NOTE);
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
  // REQ-DIST-002 the two .gitignore lines (017/D2)
  const added = writeGitignore(root);
  if (added) res.written.push(`${GITIGNORE} (${added} line${added === 1 ? "" : "s"})`);
  else res.kept.push(GITIGNORE);
  // REQ-DIST-002 skills under an ignored .claude/ never reach git (017/D3)
  if (o.skills && ignoresClaude(root)) res.notes.push(CLAUDE_NOTE);
  // REQ-SCH-003 the templates line comes last, right before next: (018/D5)
  if (o.schema) res.notes.push(TEMPLATES_NOTE);
  return res;
}
