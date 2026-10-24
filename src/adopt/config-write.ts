// REQ-ADOPT-004 write derived codes into spec-ctx.toml under [ids] caps and [ids.paths]. Comments stay.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "smol-toml";
import { CONFIG_FILE, INIT_TEXT } from "../config.ts";

/** The new text of spec-ctx.toml with the codes added. Codes already listed stay as they are. */
export function withCaps(text: string, caps: { code: string; path: string }[]): string {
  const cur = parse(text) as { ids?: { caps?: string[]; paths?: Record<string, string> } };
  const have = new Set(cur.ids?.caps ?? []);
  const paths = cur.ids?.paths ?? {};
  const addCaps = caps.filter((c) => !have.has(c.code)).map((c) => c.code);
  const addPaths = caps.filter((c) => paths[c.code] === undefined);
  let lines = text.split("\n");
  const sectionAt = (name: string): number => lines.findIndex((l) => l.trim() === `[${name}]`);
  if (addCaps.length) {
    let ids = sectionAt("ids");
    if (ids < 0) {
      lines.push("", "[ids]");
      ids = lines.length - 1;
    }
    let end = lines.findIndex((l, i) => i > ids && /^\s*\[/.test(l));
    if (end < 0) end = lines.length;
    const at = lines.findIndex((l, i) => i > ids && i < end && /^caps\s*=/.test(l));
    const all = [...(cur.ids?.caps ?? []), ...addCaps];
    const line = `caps = [${all.map((c) => JSON.stringify(c)).join(", ")}]`;
    if (at >= 0 && /\]\s*(#.*)?$/.test(lines[at]!)) lines[at] = line;
    else if (at >= 0) {
      // a caps list over several lines: replace it up to the closing bracket
      let close = at;
      while (close < end && !/\]/.test(lines[close]!)) close++;
      lines.splice(at, close - at + 1, line);
    } else lines.splice(ids + 1, 0, "# Capability codes. adopt added the derived ones.", line);
  }
  if (addPaths.length) {
    let sec = sectionAt("ids.paths");
    if (sec < 0) {
      lines = [...lines.join("\n").replace(/\n*$/, "").split("\n"), "", "[ids.paths]", "# Capability path of each code. adopt wrote the derived ones. Rename a code here before the IDs spread."];
      sec = lines.length - 1;
    }
    let end = lines.findIndex((l, i) => i > sec && /^\s*\[/.test(l));
    if (end < 0) end = lines.length;
    while (end > sec + 1 && lines[end - 1]!.trim() === "") end--;
    lines.splice(end, 0, ...addPaths.map((c) => `${c.code} = ${JSON.stringify(c.path)}`));
  }
  const out = lines.join("\n").replace(/\n*$/, "\n");
  parse(out);
  return out;
}

export function configText(root: string): string {
  const p = join(root, CONFIG_FILE);
  return existsSync(p) ? readFileSync(p, "utf8") : INIT_TEXT;
}
