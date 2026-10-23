// REQ-IDX-001 glob matching for scan and ignore paths.

const SPECIAL = ".^$+{}()[]|\\";

/** `**\/` is zero or more directories, `**` is anything, `*` and `?` stay inside one segment. */
export function globRe(pattern: string): RegExp {
  let out = "";
  let i = 0;
  while (i < pattern.length) {
    if (pattern.startsWith("**/", i)) {
      out += "(?:.*/)?";
      i += 3;
      continue;
    }
    if (pattern.startsWith("**", i)) {
      out += ".*";
      i += 2;
      continue;
    }
    const c = pattern[i]!;
    if (c === "*") out += "[^/]*";
    else if (c === "?") out += "[^/]";
    else if (SPECIAL.includes(c)) out += "\\" + c;
    else out += c;
    i++;
  }
  return new RegExp(`^(?:${out})$`, "s");
}

/** Directory part of a glob before the first wildcard segment. */
export function globBase(pattern: string): string {
  const parts: string[] = [];
  for (const seg of pattern.split("/").slice(0, -1)) {
    if (seg.includes("*") || seg.includes("?")) break;
    parts.push(seg);
  }
  return parts.join("/");
}

export function anyMatch(globs: RegExp[], path: string): boolean {
  return globs.some((g) => g.test(path));
}
