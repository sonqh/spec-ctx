// REQ-DIST-002 REQ-SCH-003 REQ-SKL-002 specctx init: config file, ID templates and config rules, skills.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ASSETS } from "../assets.generated.ts";
import { UsageExit } from "../cli/errors.ts";
import { CONFIG_FILE, DEFAULT_OPENSPEC, INIT_TEXT } from "../config.ts";
import { loadConfigOrExit } from "../cli/config.ts";

export const SCHEMA = "spec-driven-ids";
/** REQ-SCH-003 where the templates land in a project. Upstream reads no project override for the stock templates, so this is a reference path (025/D4). */
export const TEMPLATES_DIR = `openspec/templates/${SCHEMA}`;
const TEMPLATES_SRC = `schemas/${SCHEMA}/templates/`;
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
  /** REQ-SCH-003 keys of openspec/config.yaml that gained fragment items (022/D4) */
  merged: string[];
  /** REQ-CLI-007 true when every file is present and equal */
  nothing?: boolean;
  notes: string[];
}

function asset(rel: string): Buffer {
  const b64 = ASSETS[rel];
  if (b64 === undefined) throw new Error(`asset ${rel} is missing from the package`);
  return Buffer.from(b64, "base64");
}

/** REQ-DIST-002 the note when the OpenSpec version is unknown (022/D2). Strict mode. */
export const OPENSPEC_NOTE = "note: could not read the OpenSpec version. [gate] openspec uses @latest.";
export const DETECT_TIMEOUT_MS = 60_000;

/**
 * REQ-DIST-002 the OpenSpec command that init writes into [gate] openspec (022/D2, ADR-006 item 10).
 * The env var SPECCTX_OPENSPEC wins. Else `npx -y @fission-ai/openspec@latest --version` gives the pin.
 * A failure, a timeout, or output without a version keeps @latest and adds the note.
 */
export function detectOpenspec(timeoutMs = DETECT_TIMEOUT_MS): { command: string; note?: string } {
  const env = process.env.SPECCTX_OPENSPEC;
  if (env !== undefined && env.trim()) return { command: env };
  const [cmd, ...args] = DEFAULT_OPENSPEC.split(" ");
  const r = spawnSync(cmd!, [...args, "--version"], { encoding: "utf8", timeout: timeoutMs, stdio: ["ignore", "pipe", "ignore"] });
  const m = r.status === 0 && !r.error ? /\d+\.\d+\.\d+/.exec(r.stdout ?? "") : null;
  if (!m) return { command: DEFAULT_OPENSPEC, note: OPENSPEC_NOTE };
  return { command: `npx -y @fission-ai/openspec@${m[0]}` };
}

/**
 * REQ-DIST-002 the config text for one project (017/D4). `tests/**` becomes `test/**` when only `test/`
 * exists at the root. `src/**` becomes `lib/**` when only `lib/` exists. The comments stay.
 * `openspec` replaces the default command on the `openspec = ` line (022/D2).
 */
export function configText(root: string, openspec = DEFAULT_OPENSPEC): string {
  const isDir = (d: string): boolean => existsSync(join(root, d)) && statSync(join(root, d)).isDirectory();
  let text = INIT_TEXT;
  if (!isDir("tests") && isDir("test")) text = text.replace('\ntests = ["tests/**"]\n', '\ntests = ["test/**"]\n');
  if (!isDir("src") && isDir("lib")) text = text.replace('\ncode = ["src/**"]\n', '\ncode = ["lib/**"]\n');
  if (openspec !== DEFAULT_OPENSPEC) text = text.replace(`\nopenspec = "${DEFAULT_OPENSPEC}"\n`, `\nopenspec = ${JSON.stringify(openspec)}\n`);
  return text;
}

/**
 * REQ-SCH-006 wrap the ID after a requirement or scenario header prefix in square brackets (032/D1).
 * An ID in brackets already stays. Task citations, Refs lines, and tags have no header prefix, so they stay bare.
 */
export function bracketForm(text: string): string {
  return text.replace(/(### Requirement: |#### Scenario: )((?:REQ|SCN)-[^\s\]"'`]+)/g, "$1[$2]");
}

/** REQ-SCH-006 the bytes of one template in the form that `brackets` names (032/D1). */
export function templateBytes(rel: string, brackets: boolean): Buffer {
  const b = asset(rel);
  return brackets ? Buffer.from(bracketForm(b.toString("utf8"))) : b;
}

/** REQ-SCH-006 the config fragment in the form that `brackets` names (032/D1). */
export function fragmentText(brackets: boolean): string {
  const t = asset(`schemas/${SCHEMA}/config-fragment.yaml`).toString("utf8");
  return brackets ? bracketForm(t) : t;
}

/** REQ-SCH-006 the value of [ids] brackets, false when spec-ctx.toml is absent (032/D2). */
export function bracketsOf(root: string): boolean {
  return existsSync(join(root, CONFIG_FILE)) ? loadConfigOrExit(root).ids.brackets : false;
}

/** Target path relative to the project root for every file that init installs, with its bytes. */
export function plan(o: InitOpts, root: string, openspec = DEFAULT_OPENSPEC, brackets = false): [string, Buffer][] {
  const out: [string, Buffer][] = [[CONFIG_FILE, Buffer.from(configText(root, openspec))]];
  for (const rel of Object.keys(ASSETS).sort()) {
    // REQ-SCH-003 only the four templates land in the project. The fragment merges into config.yaml. No schema folder (025/D3)
    if (o.schema && rel.startsWith(TEMPLATES_SRC)) {
      out.push([`${TEMPLATES_DIR}/${rel.slice(TEMPLATES_SRC.length)}`, templateBytes(rel, brackets)]);
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

const indentOf = (line: string): number => /^[ \t]*/.exec(line)![0].length;

/** The value of a YAML list item without its single or double quotes, so two spellings of one rule compare equal. */
function itemValue(line: string): string {
  const v = line.replace(/^\s*- /, "").trim();
  const m = /^'(.*)'$/s.exec(v);
  if (m) return m[1]!.replace(/''/g, "'");
  const d = /^"(.*)"$/s.exec(v);
  return d ? d[1]! : v;
}

/**
 * The line range of a nested key inside `lines[start, end)`, where every line has an indent above `parent`.
 * Returns the key line, the end of its range, and its indent. Null when the key is absent.
 */
function findChild(lines: string[], start: number, end: number, parent: number, key: string): { at: number; end: number; indent: number } | null {
  for (let i = start; i < end; i++) {
    const line = lines[i]!;
    if (!line.trim()) continue;
    const ind = indentOf(line);
    if (ind <= parent) break;
    const m = new RegExp(`^[ \\t]*${key.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}:\\s*$`).exec(line);
    if (m) {
      let j = i + 1;
      while (j < end && (!lines[j]!.trim() || indentOf(lines[j]!) > ind)) j++;
      // trailing blank lines belong to the next block
      while (j > i + 1 && !lines[j - 1]!.trim()) j--;
      return { at: i, end: j, indent: ind };
    }
  }
  return null;
}

/** Lists of a fragment block: path segments under the top key and the item lines of each list, in order. */
function fragmentLists(block: string): { path: string[]; items: string[] }[] {
  const out: { path: string[]; items: string[] }[] = [];
  const stack: { indent: number; key: string }[] = [];
  let cur: { path: string[]; items: string[] } | null = null;
  for (const line of block.split("\n").slice(1)) {
    if (!line.trim()) continue;
    const ind = indentOf(line);
    const key = /^[ \t]*([\w-]+):\s*$/.exec(line);
    if (key) {
      while (stack.length && stack[stack.length - 1]!.indent >= ind) stack.pop();
      stack.push({ indent: ind, key: key[1]! });
      cur = null;
    } else if (/^[ \t]*- /.test(line)) {
      if (!cur) {
        cur = { path: stack.map((s) => s.key), items: [] };
        out.push(cur);
      }
      cur.items.push(line);
    }
  }
  return out;
}

/**
 * REQ-SCH-003 merge the lists of one fragment block into the same top key of the project text, item by item (022/D4).
 * An item whose value exists is skipped. A missing nested key is added with its items. Returns the count of items added.
 */
export function mergeItems(lines: string[], key: string, block: string): number {
  const top = lines.findIndex((l) => new RegExp(`^${key}:`).test(l));
  if (top < 0) return 0;
  let topEnd = top + 1;
  while (topEnd < lines.length && (!lines[topEnd]!.trim() || /^[ \t]/.test(lines[topEnd]!) || lines[topEnd]!.startsWith("#"))) topEnd++;
  while (topEnd > top + 1 && !lines[topEnd - 1]!.trim()) topEnd--;
  let added = 0;
  for (const list of fragmentLists(block)) {
    // walk the path. A step that is absent is appended under its parent with the items that follow it.
    let start = top + 1;
    let end = topEnd;
    let parent = 0;
    let missingFrom = -1;
    for (let d = 0; d < list.path.length; d++) {
      const c = findChild(lines, start, end, parent, list.path[d]!);
      if (!c) {
        missingFrom = d;
        break;
      }
      start = c.at + 1;
      end = c.end;
      parent = c.indent;
    }
    if (missingFrom >= 0) {
      // the indent of the siblings at this level, or two more than the parent
      let child = parent + 2;
      for (let i = start; i < end; i++) if (lines[i]!.trim() && !/^[ \t]*- /.test(lines[i]!)) { child = indentOf(lines[i]!); break; }
      const ins: string[] = [];
      let ind = child;
      for (let d = missingFrom; d < list.path.length; d++) {
        ins.push(" ".repeat(ind) + list.path[d] + ":");
        ind += 2;
      }
      for (const item of list.items) ins.push(" ".repeat(ind) + item.trim());
      lines.splice(end, 0, ...ins);
      topEnd += ins.length;
      added += list.items.length;
      continue;
    }
    const have = new Set<string>();
    let last = start - 1;
    let itemIndent = parent + 2;
    for (let i = start; i < end; i++) {
      if (/^[ \t]*- /.test(lines[i]!)) {
        have.add(itemValue(lines[i]!));
        last = i;
        itemIndent = indentOf(lines[i]!);
      }
    }
    const ins = list.items.filter((it) => !have.has(itemValue(it))).map((it) => " ".repeat(itemIndent) + it.trim());
    if (!ins.length) continue;
    lines.splice(last + 1, 0, ...ins);
    topEnd += ins.length;
    added += ins.length;
  }
  return added;
}

/** REQ-SCH-003 true when the project config still names the schema copy that 025 removed (025/D5). */
export function hasLegacySchema(text: string | null): boolean {
  return text !== null && new RegExp(`^schema:\\s*${SCHEMA}\\s*$`, "m").test(text);
}

/** REQ-SCH-003 the note for a project that still says schema: spec-driven-ids (025/D5). Strict mode. */
export const LEGACY_SCHEMA_NOTE = `note: schema ${SCHEMA} is no longer installed. Set schema: spec-driven in openspec/config.yaml. The rules now carry the ID instructions.`;

/**
 * REQ-SCH-003 add each top-level key of the fragment that the project config lacks.
 * A key that exists gets the fragment items it lacks (022/D4). The schema key stays as the project wrote it (025/D5).
 */
export function mergeConfig(
  current: string | null,
  fragment: string,
  other?: string,
): { text: string; added: string[]; kept: string[]; merged: { key: string; added: number; replaced?: number }[] } {
  let text = current ?? "";
  const added: string[] = [];
  const kept: string[] = [];
  const merged: { key: string; added: number; replaced?: number }[] = [];
  const have = topKeys(text);
  const blocks = topBlocks(fragment);
  // REQ-SCH-007 an item that holds the other bracket form gets the current form in place (032/D4)
  const swapped = other === undefined ? { text, size: 0, get: (_k: string): number | undefined => undefined } : swapItems(text, blocks, topBlocks(other));
  if (swapped.size) text = swapped.text;
  for (const [key, block] of blocks) {
    if (have.has(key)) {
      const lines = text.split("\n");
      const n = mergeItems(lines, key, block);
      const r = swapped.get(key) ?? 0;
      if (n) text = lines.join("\n");
      if (n || r) merged.push(r ? { key, added: n, replaced: r } : { key, added: n });
      else kept.push(key);
      continue;
    }
    text = text.trim() ? text.replace(/\n*$/, "\n\n") + block : block;
    added.push(key);
  }
  const r = repairItems(text);
  if (r.fixed) {
    text = r.text;
    added.push("repaired items");
  }
  return { text, added, kept, merged };
}

/**
 * REQ-SCH-007 replace each project item whose value equals an item of the other form with the line of the current form (032/D4).
 * The two fragments have the same lists in the same order, so items pair by position. The indent of the project line stays.
 * Returns the new text and the count per top key.
 */
function swapItems(text: string, cur: Map<string, string>, other: Map<string, string>): { text: string; size: number; get(key: string): number | undefined } {
  const swap = new Map<string, string>();
  for (const [key, block] of cur) {
    const a = fragmentLists(block);
    const b = fragmentLists(other.get(key) ?? "");
    a.forEach((list, i) =>
      list.items.forEach((item, j) => {
        const o = b[i]?.items[j];
        if (o !== undefined && itemValue(o) !== itemValue(item)) swap.set(`${key}\0${itemValue(o)}`, item.trim());
      }),
    );
  }
  const counts = new Map<string, number>();
  if (!swap.size) return { text, size: 0, get: (k) => counts.get(k) };
  let top: string | null = null;
  const lines = text.split("\n").map((line) => {
    const m = TOP_KEY.exec(line);
    if (m) top = m[1]!;
    if (!top || !/^[ \t]+- /.test(line)) return line;
    const to = swap.get(`${top}\0${itemValue(line)}`);
    if (to === undefined) return line;
    counts.set(top, (counts.get(top) ?? 0) + 1);
    return " ".repeat(indentOf(line)) + to;
  });
  return { text: lines.join("\n"), size: counts.size, get: (k) => counts.get(k) };
}

/** REQ-SCH-007 the text of the `merged` count: added, replaced, or both (032/D4). */
export function mergedCount(x: { added: number; replaced?: number }): string {
  if (!x.replaced) return `${x.added} added`;
  return x.added ? `${x.added} added, ${x.replaced} replaced` : `${x.replaced} replaced`;
}

/** REQ-DIST-002 the four lines init owns in .gitignore (017/D2, 022/D5). current.json and gate-log.jsonl are per session. */
export const GITIGNORE_LINES = [".ctx/index.json", "adopt-report.md", ".ctx/current.json", ".ctx/gate-log.jsonl"];
const GITIGNORE = ".gitignore";

/** The lines of a .gitignore, trimmed, with a leading slash dropped, so `/x` and `x` compare equal. */
function ignoreLines(text: string): Set<string> {
  return new Set(text.split(/\r?\n/).map((l) => l.trim().replace(/^\//, "")));
}

/**
 * REQ-DIST-002 add the absent lines under a `# spec-ctx` comment. Create the file when it is missing.
 * Returns the number of lines added, 0 when all four are present.
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

/** REQ-SCH-003 where the templates with the ID placeholders are. Printed after the schema step (018/D5, 025/D4). */
export const TEMPLATES_NOTE = `templates: ${TEMPLATES_DIR}/ (spec.md, tasks.md hold the ID placeholders)`;

export const CLAUDE_NOTE = "note: .gitignore ignores .claude/. The skills under .claude/skills/ stay out of git. The copies under .agents/skills/ are tracked.";

export function runInit(root: string, o: InitOpts): InitResult {
  const res: InitResult = { written: [], kept: [], changed: [], merged: [], notes: [] };
  // REQ-DIST-002 the detection runs only when init writes spec-ctx.toml. An existing file stays (022/D2).
  let openspec = DEFAULT_OPENSPEC;
  if (!existsSync(join(root, CONFIG_FILE))) {
    const d = detectOpenspec();
    openspec = d.command;
    if (d.note) res.notes.push(d.note);
  }
  // REQ-SCH-006 the form of the templates and the rules follows [ids] brackets (032/D2)
  const brackets = bracketsOf(root);
  const fragment = fragmentText(brackets);
  const otherFragment = fragmentText(!brackets);
  let files = plan(o, root, openspec, brackets);
  // REQ-CLI-007 every file present with the same bytes and no config key to add: nothing to do
  // an existing spec-ctx.toml counts as present, because the user owns it (014/D4)
  const same = files.every(([rel, data]) => existsSync(join(root, rel)) && (rel === CONFIG_FILE || readFileSync(join(root, rel)).equals(data)));
  // REQ-DIST-013 a skills refresh in a project with spec-ctx.toml touches only the skill folders (038/D3)
  const skillsOnly = o.skills && !o.schema && existsSync(join(root, CONFIG_FILE));
  const ignoreDone = skillsOnly || existsSync(join(root, GITIGNORE)) && GITIGNORE_LINES.every((l) => ignoreLines(readFileSync(join(root, GITIGNORE), "utf8")).has(l));
  if (same && ignoreDone && !o.force) {
    const cfgPath = join(root, "openspec/config.yaml");
    const cur = existsSync(cfgPath) ? readFileSync(cfgPath, "utf8") : null;
    const m = o.schema ? mergeConfig(cur, fragment, otherFragment) : null;
    if (!m || (!m.added.length && !m.merged.length)) {
      res.nothing = true;
      if (o.skills && ignoresClaude(root)) res.notes.push(CLAUDE_NOTE);
      if (o.schema && hasLegacySchema(cur)) res.notes.push(LEGACY_SCHEMA_NOTE);
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
    // REQ-SCH-007 a template that holds the other bracket form is unchanged, so it gets the current form (032/D3)
    const other = new Map(plan(o, root, openspec, !brackets).filter(([rel]) => rel.startsWith(`${TEMPLATES_DIR}/`)));
    const differs = (rel: string, data: Buffer): boolean => {
      const have = readFileSync(join(root, rel));
      return !have.equals(data) && !(other.get(rel)?.equals(have) ?? false);
    };
    res.changed = files.filter(([rel, data]) => existsSync(join(root, rel)) && differs(rel, data)).map(([rel]) => rel);
    for (const rel of res.changed) res.kept.push(`${rel} (other content)`);
    files = files.filter(([rel, data]) => !existsSync(join(root, rel)) || (!readFileSync(join(root, rel)).equals(data) && !differs(rel, data)));
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
    const m = mergeConfig(cur, fragment, otherFragment);
    if (m.added.length || m.merged.length) {
      mkdirSync(dirname(cfgPath), { recursive: true });
      writeFileSync(cfgPath, m.text);
      if (m.added.length) res.written.push(`openspec/config.yaml (${m.added.join(", ")})`);
    }
    // REQ-SCH-003 one line per key that gained items (022/D4)
    for (const x of m.merged) res.merged.push(`openspec/config.yaml ${x.key} (${mergedCount(x)})`);
    for (const k of m.kept) res.kept.push(`openspec/config.yaml ${k}`);
    // REQ-SCH-003 the schema line is the user's. A legacy value gets a note and stays (025/D5)
    if (hasLegacySchema(cur)) res.notes.push(LEGACY_SCHEMA_NOTE);
  }
  // REQ-DIST-002 the four .gitignore lines (017/D2, 022/D5)
  if (!skillsOnly) {
    const added = writeGitignore(root);
    if (added) res.written.push(`${GITIGNORE} (${added} line${added === 1 ? "" : "s"})`);
    else res.kept.push(GITIGNORE);
  }
  // REQ-DIST-002 skills under an ignored .claude/ never reach git (017/D3)
  if (o.skills && ignoresClaude(root)) res.notes.push(CLAUDE_NOTE);
  // REQ-SCH-003 the templates line comes last, right before next: (018/D5)
  if (o.schema) res.notes.push(TEMPLATES_NOTE);
  return res;
}
