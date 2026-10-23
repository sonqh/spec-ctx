#!/usr/bin/env python3
"""ctx: deterministic context engine over an OpenSpec repository.

Reference implementation for agentrc:CTX-001 to agentrc:CTX-012. Stdlib only.
Parity oracle for the spec-ctx TypeScript engine. It reads spec-ctx.toml at the root.

Commands:
    ctx build                      write .ctx/index.json
    ctx query <term...> [--kind K] [--change C] [--all] [--limit N] [--json]
    ctx related <ID> [--depth N] [--all] [--json]
    ctx bundle <ID...> [--budget N] [--depth D] [--all]
    ctx check [--strict]
    ctx status

Every command except build rebuilds a stale index first (agentrc:CTX-010).
Exit codes: 0 ok, 1 check failed, 2 usage error.
"""
import argparse
import json
import os
import re
import sys
import tomllib
from pathlib import Path

ROOT = Path(os.environ.get("SPECCTX_ROOT") or os.environ.get("AGENTRC_REPO") or Path(__file__).resolve().parents[2])
INDEX = ROOT / ".ctx" / "index.json"
HANDOFF = ROOT / ".ctx" / "handoff.md"

# Every pattern is ASCII only so that both engines give the same matches. Python str patterns
# are Unicode aware by default and would match non-ASCII digits and word characters.
A = re.ASCII
ID_RE = re.compile(r"\b(REQ-[A-Z]+-\d{3}|SCN-[A-Z]+-\d{3}-\d+|ADR-\d{3})\b", A)
SCN_RE = re.compile(r"\bSCN-[A-Z]+-\d{3}-\d+\b", A)
REQ_HDR = re.compile(r"^### Requirement:\s*(REQ-[A-Z]+-\d{3})?\s*(.*)$", A | re.S)
SCN_HDR = re.compile(r"^#### Scenario:\s*(SCN-[A-Z]+-\d{3}-\d+)?\s*(.*)$", A | re.S)
ADR_HDR = re.compile(r"^# (ADR-\d{3})\s+(.*)$", A | re.S)
REFS_RE = re.compile(r"^Refs:\s*(.+)$", A | re.S)
TASK_REQ = re.compile(r"\[(REQ-[A-Z]+-\d{3}(?:\s*,\s*REQ-[A-Z]+-\d{3})*)\]", A)
CODE_TAG = re.compile(r"(?://|#|/\*|\*)\s*(REQ-[A-Z]+-\d{3})", A)
COVER_TAG = re.compile(r"Covers:\s*(REQ-[A-Z]+-\d{3}(?:\s*,\s*REQ-[A-Z]+-\d{3})*)", A)
RETIRED_RE = re.compile(r"\b(REQ-[A-Z]+-\d{3}|ADR-\d{3})\b", A)
SENTENCE_END = re.compile(r"(?<=[.!?])\s", A)
COMMA = re.compile(r"\s*,\s*", A)
REQ_CAP = re.compile(r"^REQ-([A-Z]+)-", A)

SKIP_DIRS = {"node_modules", ".git"}

# spec-ctx REQ-DIST-002 defaults. They match REQ-IDX-001 and REQ-QRY-003.
DEFAULTS = {
    "scan": {"specs": ["openspec/specs/**/*.md"], "changes": ["openspec/changes/**/*.md"],
             "decisions": ["decisions/*.md"], "code": ["src/**"], "tests": ["tests/**"], "ignore": []},
    "ids": {"caps": [], "task_pattern": r"\d+\.\d+"},
    "bundle": {"budget": 8000, "depth": 1},
}


def load_config():
    cfg = {k: dict(v) for k, v in DEFAULTS.items()}
    p = ROOT / "spec-ctx.toml"
    if p.exists():
        raw = tomllib.loads(p.read_text(encoding="utf-8"))
        for sec, vals in cfg.items():
            for k, v in (raw.get(sec) or {}).items():
                if k in vals:
                    vals[k] = [v] if isinstance(v, str) and isinstance(DEFAULTS[sec][k], list) else v
    return cfg


CFG = load_config()
TASK_RE = re.compile(r"^\s*- \[([ xX]?)\]\s*(" + CFG["ids"]["task_pattern"] + r")\s+(.*)$", A | re.S)


def glob_re(pattern):
    """Glob to regex. `**/` is zero or more directories, `**` is anything, `*` and `?` stay in one segment."""
    out, i = "", 0
    while i < len(pattern):
        c = pattern[i]
        if pattern.startswith("**/", i):
            out += "(?:.*/)?"
            i += 3
            continue
        if pattern.startswith("**", i):
            out += ".*"
            i += 2
            continue
        if c == "*":
            out += "[^/]*"
        elif c == "?":
            out += "[^/]"
        elif c in ".^$+{}()[]|\\":
            out += "\\" + c
        else:
            out += c
        i += 1
    return re.compile(out, re.S)


def glob_base(pattern):
    """Directory part of a glob before the first wildcard segment."""
    parts = []
    for seg in pattern.split("/")[:-1]:
        if any(ch in seg for ch in "*?"):
            break
        parts.append(seg)
    return "/".join(parts)


def read(path):
    """UTF-8 text with no newline translation. Path.read_text would turn a lone CR into a line break."""
    return path.read_bytes().decode("utf-8", errors="replace")


def split_lines(text):
    """Lines split on LF only, with a trailing CR removed. Editors count lines the same way."""
    lines = text.split("\n")
    if lines and lines[-1] == "":
        lines.pop()
    return [line[:-1] if line.endswith("\r") else line for line in lines]
SPEC_KINDS = ("req", "scn", "adr")
# agentrc:CTX-006 fixed block order after the requested IDs
KIND_RANK = {"adr": 0, "decision": 1, "req": 2, "scn": 2, "task": 3, "code": 4, "test": 5}


def rel(p: Path) -> str:
    return str(p.relative_to(ROOT)).replace(os.sep, "/")


def change_of(path: str) -> str:
    m = re.match(r"openspec/changes/(archive/)?([^/]+)/", path)
    if m:
        name = m.group(2)
        if m.group(1):
            # openspec archive prefixes the folder with a date: 2026-10-23-001-foundation
            name = re.sub(r"^\d{4}-\d{2}-\d{2}-", "", name)
        return name
    return "main"


def change_num(change: str) -> str:
    """ADR-002: task and decision IDs use the number prefix of the change folder, e.g. 002/3.2 and 002/D3."""
    return change.split("-")[0]


def squash(lines) -> str:
    return " ".join(" ".join(lines).split()).lower()


SCAN = CFG["scan"]
MD_GLOBS = [glob_re(g) for k in ("specs", "changes", "decisions") for g in SCAN[k]]
SRC_GLOBS = [glob_re(g) for k in ("code", "tests") for g in SCAN[k]]
TEST_GLOBS = [glob_re(g) for g in SCAN["tests"]]
IGNORE = [glob_re(g) for g in SCAN["ignore"]]


# agentrc:CTX-001 source walk. agentrc:CTX-010 uses the same walk for the stale check, so it never parses files.
def walk():
    """Files that match the scan globs, sorted by path. Ignored directories are pruned."""
    bases = sorted({glob_base(g) for k in ("specs", "changes", "decisions", "code", "tests") for g in SCAN[k]})
    seen = {}
    for base in bases:
        top = ROOT / base if base else ROOT
        if not top.is_dir():
            continue
        for dirpath, dirnames, filenames in os.walk(top):
            r = rel(Path(dirpath))
            pre = "" if r == "." else r + "/"
            dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS
                                 and not any(g.fullmatch(f"{pre}{d}/") for g in IGNORE))
            for f in filenames:
                path = pre + f
                if path in seen or any(g.fullmatch(path) for g in IGNORE):
                    continue
                if any(g.fullmatch(path) for g in MD_GLOBS):
                    seen[path] = "md"
                elif any(g.fullmatch(path) for g in SRC_GLOBS):
                    seen[path] = "src"
    return [(ROOT / p, seen[p]) for p in sorted(seen)]


def scanned_of(files):
    newest = 0
    for p, _ in files:
        try:
            newest = max(newest, os.stat(p).st_mtime_ns // 1_000_000)
        except OSError:
            pass
    return {"count": len(files), "newest_mtime_ms": newest}


def block_range(lines, start):
    """Line range of a markdown block from its header to the next header of the same or a higher level."""
    hdr = lines[start]
    level = len(hdr) - len(hdr.lstrip("#")) if hdr.startswith("#") else 6
    end = start + 1
    in_fence = False
    while end < len(lines):
        line = lines[end]
        if line.strip().startswith(("```", "~~~")):
            in_fence = not in_fence
        elif not in_fence and line.startswith("#"):
            lvl = len(line) - len(line.lstrip("#"))
            if lvl <= level:
                break
        end += 1
    return start, end


def scan_markdown(path: Path, entries, problems):
    text = read(path)
    lines = split_lines(text)
    rpath = rel(path)
    change = change_of(rpath)
    status = "archived" if "/archive/" in rpath else "active"
    is_design = rpath.endswith("design.md")
    cur_req = None
    cur_entry = None
    in_fence = False
    section = ""
    decision = None
    decisions = []
    blocks = []
    for i, line in enumerate(lines, 1):
        if line.strip().startswith(("```", "~~~")):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        if decision is not None:
            # agentrc:CTX-011 a decision bullet runs until a blank line, the next bullet, or a header
            if line.strip() and not line.startswith(("- ", "#")):
                decision["_lines"].append(line.strip())
                continue
            decision = None
        if line.startswith("## "):
            # delta section of an active change: ADDED, MODIFIED, REMOVED, RENAMED. Also Decisions in design.md.
            section = line[3:].strip().split(" ")[0].upper()
            continue
        if is_design and section == "DECISIONS" and line.startswith("- "):
            decision = {"id": f"{change_num(change)}/D{len(decisions) + 1}", "kind": "decision", "file": rpath, "line": i,
                        "change": change, "status": status, "refs": [], "_lines": [line[2:].strip()]}
            entries.append(decision)
            decisions.append(decision)
            continue
        m = REQ_HDR.match(line)
        if m:
            rid, title = m.group(1), m.group(2).strip()
            if not rid:
                problems.append((rpath, i, "missing-id", title))
                cur_req, cur_entry = None, None
                continue
            cur_req = rid
            st = status
            if status == "active" and change != "main":
                # agentrc:CTX-009 a MODIFIED block in an active change is the pending version of a main-spec ID
                if section == "MODIFIED":
                    st = "modified"
                elif section == "REMOVED":
                    st = "removed"
            cur_entry = {"id": rid, "kind": "req", "file": rpath, "line": i, "title": title,
                         "change": change, "status": st, "refs": [], "scenarios": []}
            entries.append(cur_entry)
            blocks.append(cur_entry)
            continue
        m = SCN_HDR.match(line)
        if m:
            sid, title = m.group(1), m.group(2).strip()
            if not sid:
                problems.append((rpath, i, "missing-id", title))
                continue
            st = cur_entry["status"] if cur_entry else status
            e = {"id": sid, "kind": "scn", "file": rpath, "line": i, "title": title,
                 "change": change, "status": st, "refs": []}
            if cur_req and sid.startswith("SCN-" + cur_req[4:]):
                cur_entry["scenarios"].append(sid)
                e["refs"].append(cur_req)
            elif cur_req:
                problems.append((rpath, i, "scenario-id-mismatch", f"{sid} under {cur_req}"))
            entries.append(e)
            blocks.append(e)
            continue
        m = ADR_HDR.match(line)
        if m and i <= 3:
            cur_entry = {"id": m.group(1), "kind": "adr", "file": rpath, "line": i,
                         "title": m.group(2).strip(), "change": "main", "status": "active", "refs": []}
            entries.append(cur_entry)
            blocks.append(cur_entry)
            continue
        m = REFS_RE.match(line.strip())
        if m and cur_entry is not None:
            for ref in COMMA.split(m.group(1).strip()):
                if ID_RE.fullmatch(ref):
                    cur_entry["refs"].append(ref)
                else:
                    problems.append((rpath, i, "bad-ref", ref))
            continue
        m = TASK_RE.match(line)
        if m and rpath.endswith("tasks.md"):
            # a task_pattern with its own groups shifts the group numbers, so the body is the last group
            box, num, body = m.group(1), m.group(2), m.groups()[-1]
            tid = f"{change_num(change)}/{num}"
            reqs = []
            for grp in TASK_REQ.findall(body):
                reqs += COMMA.split(grp)
            if not reqs:
                problems.append((rpath, i, "task-without-req", tid))
            if "Verify:" not in body:
                problems.append((rpath, i, "task-without-verify", tid))
            # agentrc:CTX-004 the full task body is the title, so query output shows the Verify clause
            entries.append({"id": tid, "kind": "task", "file": rpath, "line": i, "title": body.strip(),
                            "text": "", "change": change,
                            "status": "done" if box.strip().lower() == "x" else "open", "refs": reqs})
    # agentrc:CTX-002 text holds the lower-cased body of each block
    for e in blocks:
        # spec-ctx REQ-IDX-002 text is empty for adr and task entries
        if e["kind"] == "adr":
            e["text"] = ""
            continue
        s, end = block_range(lines, e["line"] - 1)
        e["text"] = squash(lines[s + 1:end])
    for e in decisions:
        body = " ".join(e.pop("_lines"))
        e["title"] = SENTENCE_END.split(body, 1)[0]
        e["text"] = squash([body])
        if "Refs:" in body:
            e["refs"] = ID_RE.findall(body.split("Refs:", 1)[1])


def scan_source(path: Path, entries, scn_named):
    rpath = rel(path)
    is_test = (any(g.fullmatch(rpath) for g in TEST_GLOBS) or "/tests/" in rpath or rpath.startswith("tests/")
               or ".test." in rpath or "test_" in path.name)
    try:
        content = read(path)
    except OSError:
        return
    if is_test:
        # agentrc:CTX-007 a scenario is tested when a test file names it
        scn_named.update(SCN_RE.findall(content))
    for i, line in enumerate(split_lines(content), 1):
        if is_test:
            m = COVER_TAG.search(line)
            if m:
                for rid in COMMA.split(m.group(1)):
                    entries.append({"id": f"{rpath}:{i}", "kind": "test", "file": rpath, "line": i,
                                    "title": line.strip(), "text": "", "change": "main", "status": "active",
                                    "refs": [rid]})
                continue
        m = CODE_TAG.search(line)
        if m and "Covers:" not in line:
            entries.append({"id": f"{rpath}:{i}", "kind": "code", "file": rpath, "line": i,
                            "title": line.strip(), "text": "", "change": "main", "status": "active",
                            "refs": [m.group(1)]})


def tier(e):
    """agentrc:CTX-009 canonical order: active change, then openspec/specs, then archive."""
    st = e["status"]
    if st == "removed":
        return None
    if st == "modified" or (st == "active" and e["change"] != "main"):
        return 0
    if st == "active":
        return 1
    return 2


def mark_canonical(entries):
    best = {}
    for e in entries:
        if e["kind"] not in SPEC_KINDS:
            e["canonical"] = True
            continue
        e["canonical"] = False
        t = tier(e)
        if t is None:
            continue
        key = (t, e["file"], e["line"])
        if e["id"] not in best or key < best[e["id"]][0]:
            best[e["id"]] = (key, e)
    for _, e in best.values():
        e["canonical"] = True


def retired_ids():
    p = ROOT / "decisions" / "retired-ids.md"
    if not p.exists():
        return set()
    return set(RETIRED_RE.findall(read(p)))


def build(files=None):
    if files is None:
        files = walk()
    entries, problems, scn_named = [], [], set()
    for p, kind in files:
        if kind == "md":
            scan_markdown(p, entries, problems)
        elif p.is_file():
            scan_source(p, entries, scn_named)
    mark_canonical(entries)
    entries.sort(key=lambda e: (e["id"], e["file"], e["line"]))
    problems = sorted(set(problems))
    data = {"entries": entries, "problems": problems, "scanned": scanned_of(files),
            "scn_named": sorted(scn_named)}
    INDEX.parent.mkdir(parents=True, exist_ok=True)
    INDEX.write_text(dumps(data) + "\n", encoding="utf-8")
    return data


def dumps(obj):
    """REQ-IDX-002 two-space indent, sorted keys, UTF-8 text kept as is."""
    return json.dumps(obj, indent=2, sort_keys=True, ensure_ascii=False)


def load():
    """agentrc:CTX-010 compare the stored scan with a fresh stat walk and rebuild on mismatch."""
    files = walk()
    data = None
    if INDEX.exists():
        try:
            data = json.loads(INDEX.read_text(encoding="utf-8"))
        except ValueError:
            data = None
    if data is None or data.get("scanned") != scanned_of(files):
        data = build(files)
        print("index rebuilt", file=sys.stderr)
    data["problems"] = [tuple(p) for p in data["problems"]]
    return data


def canon(entries):
    return {e["id"]: e for e in entries if e.get("canonical")}


def pool_of(entries, all_):
    return entries if all_ else [e for e in entries if e.get("canonical")]


def related(entries, start, depth, all_=False):
    """agentrc:CTX-005, agentrc:CTX-012 IDs reachable from start with the reason each one was included."""
    pool = pool_of(entries, all_)
    ids = canon(entries)
    for e in pool:
        ids.setdefault(e["id"], e)
    back = {}
    for e in pool:
        for r in e["refs"]:
            back.setdefault(r, set()).add(e["id"])
    found = {}

    def add(i, reason):
        if i != start and i not in found:
            found[i] = reason
            return True
        return False

    s = ids.get(start)
    if s and s["kind"] == "req":
        for sid in s.get("scenarios", []):
            add(sid, f"scenario of {start}")
    frontier = [start]
    for _ in range(depth):
        nxt = []
        for x in frontier:
            ex = ids.get(x)
            if ex:
                for r in ex["refs"]:
                    if add(r, f"ref from {x}"):
                        nxt.append(r)
                if ex["kind"] == "req":
                    for sid in ex.get("scenarios", []):
                        if add(sid, f"scenario of {x}"):
                            nxt.append(sid)
            for y in sorted(back.get(x, ())):
                ey = ids.get(y)
                k = ey["kind"] if ey else "?"
                if k == "scn" and ex and y in ex.get("scenarios", []):
                    reason = f"scenario of {x}"
                elif k == "decision":
                    reason = f"decision for {x}"
                elif k == "task":
                    reason = f"task cites {x}"
                elif k == "code":
                    reason = f"implements {x}"
                elif k == "test":
                    reason = f"covers {x}"
                else:
                    reason = f"ref to {x}"
                if add(y, reason):
                    nxt.append(y)
        frontier = nxt
    def rank(i):
        e = ids.get(i)
        return (KIND_RANK.get(e["kind"], 9) if e else 9, i)
    return [(i, found[i]) for i in sorted(found, key=rank)]


_lines_cache = {}


def file_lines(rpath):
    if rpath not in _lines_cache:
        _lines_cache[rpath] = split_lines(read(ROOT / rpath))
    return _lines_cache[rpath]


def block_text(e):
    """Markdown text of an entry. Code and test entries print no body, only their provenance line."""
    if e["kind"] in ("code", "test"):
        return ""
    lines = file_lines(e["file"])
    start = e["line"] - 1
    if e["kind"] == "task":
        return lines[start].strip() + "\n"
    if e["kind"] == "decision":
        out = [lines[start]]
        for line in lines[start + 1:]:
            if not line.strip() or line.startswith(("- ", "#")):
                break
            out.append(line)
        return "\n".join(out).rstrip() + "\n"
    s, end = block_range(lines, start)
    return "\n".join(lines[s:end]).rstrip() + "\n"


def provenance(e, reason):
    return f"-- {e['id']} | {e['file']}:{e['line']} | {e['status']} | {reason}\n"


def bundle(entries, wanted, budget, depth, all_=False):
    """agentrc:CTX-006 canonical text with one provenance line per block, in a fixed order, within a budget."""
    ids = canon(entries)
    blocks = []
    for i in wanted:
        copies = [ids[i]]
        if all_:
            copies += [e for e in entries if e["id"] == i and not e.get("canonical")]
        blocks += [(e, "requested") for e in copies]
    found = {}
    for i in wanted:
        # decisions that reference a requested ID are included at every depth
        for e in entries:
            if e["kind"] == "decision" and i in e["refs"] and e["id"] not in found:
                found[e["id"]] = f"decision for {i}"
        for r, reason in related(entries, i, depth, all_):
            if r not in wanted and r not in found:
                found[r] = reason
    tail = [r for r in found if r in ids and ids[r]["kind"] != "scn"]  # scenarios print inside their requirement
    tail.sort(key=lambda r: (KIND_RANK.get(ids[r]["kind"], 9), r))
    blocks += [(ids[r], found[r]) for r in tail]
    out, used, omitted = [], 0, []
    for e, reason in blocks:
        body = block_text(e)
        # a blank line closes a block with a body. Code and test paths stay one line each.
        t = provenance(e, reason) + body + ("\n" if body else "")
        if used + len(t) > budget:
            omitted.append(e["id"])
            continue
        out.append(t)
        used += len(t)
    text = "".join(out)
    if omitted:
        # agentrc:BOOT-003 name the omitted IDs so the agent can request them one at a time
        text += f"truncated: {len(omitted)} entries omitted: {', '.join(omitted)}\n"
    return text


def check(data, strict, as_json=False):
    entries, problems = data["entries"], data["problems"]
    findings = list(problems)
    seen = {}
    for e in entries:
        if e["kind"] in SPEC_KINDS:
            # archived folders keep a copy of main specs. A MODIFIED or REMOVED block is a pending edit of one.
            if e["status"] in ("archived", "modified", "removed"):
                continue
            if e["id"] in seen:
                findings.append((e["file"], e["line"], "duplicate-id", e["id"]))
            seen.setdefault(e["id"], e)
    known = {e["id"] for e in entries if e["kind"] in ("req", "scn", "adr", "task")}
    ids = canon(entries)
    retired = retired_ids()
    caps = set(CFG["ids"]["caps"])
    for e in entries:
        if e["kind"] in ("req", "adr") and e["id"] in retired and e["status"] == "active":
            findings.append((e["file"], e["line"], "reused-id", e["id"]))
        for r in e["refs"]:
            if r not in known:
                rule = "unknown-task-req" if e["kind"] == "task" else "dangling-ref"
                if e["kind"] == "task" and not strict:
                    continue
                findings.append((e["file"], e["line"], rule, r))
            elif e["kind"] == "code" and (r not in ids or ids[r]["status"] == "archived"):
                # agentrc:CTX-007 the tag points at a requirement that lives only in an archived change
                findings.append((e["file"], e["line"], "code-tag-no-canonical", r))
        if e["kind"] == "req" and e["status"] != "removed" and not e.get("scenarios"):
            findings.append((e["file"], e["line"], "req-without-scn", e["id"]))
        if caps and e["kind"] == "req" and e["status"] != "archived":
            # spec-ctx REQ-CHK-001 a capability code that the config does not list
            m = REQ_CAP.match(e["id"])
            if m and m.group(1) not in caps:
                findings.append((e["file"], e["line"], "unknown-cap", e["id"]))
    if strict:
        covered = {r for e in entries if e["kind"] == "test" for r in e["refs"]}
        named = set(data.get("scn_named", []))
        for e in entries:
            if e["change"] != "main" or e["status"] != "active":
                continue
            if e["kind"] == "req" and e["id"] not in covered:
                findings.append((e["file"], e["line"], "uncovered", e["id"]))
            if e["kind"] == "scn" and e["id"] not in named:
                findings.append((e["file"], e["line"], "scenario-untested", e["id"]))
    findings = sorted(set(findings))
    if as_json:
        print(dumps({"count": len(findings),
                     "findings": [{"file": f, "line": l, "rule": rule, "id": i} for f, l, rule, i in findings]}))
        return 1 if findings else 0
    for f, l, rule, i in findings:
        print(f"{f}:{l}  {rule}  {i}")
    print(f"{len(findings)} finding(s)")
    return 1 if findings else 0


def open_questions():
    """First line of each open_questions item in the handoff file."""
    if not HANDOFF.exists():
        return []
    items, inside = [], False
    for line in split_lines(read(HANDOFF)):
        if line.startswith("open_questions:"):
            inside = True
            continue
        if not inside:
            continue
        if line.startswith("- "):
            items.append(line[2:].strip())
        elif line.strip() and not line.startswith((" ", "\t")):
            break
    return items


def status(entries):
    """agentrc:CTX-008 reads only the index and the handoff file."""
    changes, archived = {}, set()
    for e in entries:
        m = re.match(r"openspec/changes/archive/([^/]+)/", e["file"])
        if m:
            archived.add(m.group(1))
            continue
        if e["kind"] == "task" and e["status"] in ("done", "open") and e["change"] != "main":
            c = changes.setdefault(e["change"], {"done": 0, "open": 0})
            c[e["status"]] += 1
    covered = {r for e in entries if e["kind"] == "test" for r in e["refs"]}
    uncovered = [e["id"] for e in entries if e["kind"] == "req" and e["change"] == "main"
                 and e["status"] == "active" and e["id"] not in covered]
    for c in sorted(changes):
        d = changes[c]
        print(f"{c}  done {d['done']}  open {d['open']}")
    if not changes:
        print("no active change")
        if archived:
            print(f"last archived: {change_of('openspec/changes/archive/' + max(archived) + '/')}")
    print(f"uncovered active REQs in main: {len(uncovered)}")
    if HANDOFF.exists():
        print(f"handoff: {rel(HANDOFF)} (read it first)")
        if not changes:
            qs = open_questions()
            print(f"open_questions: {len(qs)}")
            for q in qs:
                print(f"- {q}")


def main(argv):
    ap = argparse.ArgumentParser(prog="ctx")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("build")
    q = sub.add_parser("query")
    q.add_argument("terms", nargs="+")
    q.add_argument("--kind")
    q.add_argument("--change")
    q.add_argument("--all", action="store_true")
    q.add_argument("--limit", type=int, default=20)
    q.add_argument("--json", action="store_true")
    r = sub.add_parser("related")
    r.add_argument("id")
    r.add_argument("--depth", type=int, default=1)
    r.add_argument("--all", action="store_true")
    r.add_argument("--json", action="store_true")
    b = sub.add_parser("bundle")
    b.add_argument("ids", nargs="+")
    b.add_argument("--budget", type=int, default=8000)
    b.add_argument("--depth", type=int, default=1)
    b.add_argument("--all", action="store_true")
    c = sub.add_parser("check")
    c.add_argument("--strict", action="store_true")
    c.add_argument("--json", action="store_true")
    sub.add_parser("status")
    a = ap.parse_args(argv)

    if a.cmd == "build":
        data = build()
        print(f"indexed {len(data['entries'])} entries, {len(data['problems'])} problem(s) -> {rel(INDEX)}")
        return 0
    data = load()
    entries = data["entries"]
    if a.cmd == "query":
        # agentrc:CTX-004 token AND over id, title, text. Score 3 for id, 2 for title, 1 for text, per term.
        terms = [t for arg in a.terms for t in arg.lower().split()]
        hits = []
        for e in pool_of(entries, a.all):
            if a.kind and e["kind"] != a.kind or a.change and e["change"] != a.change:
                continue
            idl, tl, xl = e["id"].lower(), e["title"].lower(), e.get("text", "")
            if not all(t in idl or t in tl or t in xl for t in terms):
                continue
            score = sum(3 * (t in idl) + 2 * (t in tl) + (t in xl) for t in terms)
            hits.append((-score, e["id"], e["file"], e["line"], e))
        hits.sort(key=lambda h: h[:4])
        hits = [h[4] for h in hits]
        if a.limit > 0:
            hits = hits[:a.limit]
        if a.json:
            print(dumps(hits))
        else:
            for e in hits:
                print(f"{e['id']}  {e['kind']}  {e['status']}  {e['file']}:{e['line']}  {e['title']}")
        return 0
    if a.cmd == "related":
        ids = canon(entries)
        if a.id not in ids and not (a.all and any(e["id"] == a.id for e in entries)):
            print(f"unknown id {a.id}", file=sys.stderr)
            return 2
        rows = []
        for i, reason in related(entries, a.id, a.depth, a.all):
            copies = [e for e in entries if e["id"] == i] if a.all else [ids[i]] if i in ids else []
            copies.sort(key=lambda e: not e.get("canonical"))
            rows += [(e, reason) for e in copies]
        if a.json:
            print(dumps([dict(e, reason=reason) for e, reason in rows]))
        else:
            for e, reason in rows:
                print(f"{e['kind']}  {e['id']}  {e['status']}  {e['file']}:{e['line']}  {reason}")
        return 0
    if a.cmd == "bundle":
        ids = canon(entries)
        unknown = [i for i in a.ids if i not in ids]
        if unknown:
            print(f"unknown id(s): {', '.join(unknown)}", file=sys.stderr)
            return 2
        sys.stdout.write(bundle(entries, a.ids, a.budget, a.depth, a.all))
        return 0
    if a.cmd == "check":
        return check(data, a.strict, a.json)
    if a.cmd == "status":
        status(entries)
        return 0
    return 2


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except BrokenPipeError:
        sys.exit(0)
