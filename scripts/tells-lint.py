#!/usr/bin/env python3
"""Deterministic linter for the AI-writing tells in SKILL.md.

Checks only patterns a regex can see. It never judges meaning, never flags
hedges, and never checks whether a rewrite kept the original claim.

Usage:
    tells-lint.py FILE [FILE ...]
    echo "text" | tells-lint.py [--json]
    tells-lint.py --baseline 5 FILE       # pass unless hard findings exceed 5
    tells-lint.py --disable dash,stock-word FILE
    tells-lint.py --selftest

Exit 1 when hard findings exceed the baseline (default 0).
Advisory findings never fail the run.
Exit 2 on a usage error.
"""
import argparse
import json
import re
import sys

STOCK_WORDS = [
    "additionally", "align with", "bolster", "crucial", "deep dive", "delve",
    "enduring", "enhance", "garner", "interplay", "intricate", "intricacies",
    "leverage", "meticulous", "meticulously", "pivotal", "seamless", "seamlessly",
    "showcase", "tapestry", "testament", "underscore", "underscores", "vibrant",
    "game-changer", "game changer", "cutting-edge", "cutting edge",
]

SALES_WORDS = [
    "nestled", "breathtaking", "renowned", "must-visit", "stunning",
    "diverse array", "in the heart of", "profound",
]

CHAT_RESIDUE = [
    r"great question", r"i hope this helps", r"\bof course!", r"\bcertainly!",
    r"you're absolutely right", r"would you like me to", r"want me to",
    r"let me know if", r"should i continue",
]

RUN_UP = [
    r"let'?s dive in", r"let'?s explore", r"let'?s break this down",
    r"here'?s what you need to know", r"without further ado", r"here'?s the thing",
    r"the thing is,", r"real talk", r"let'?s be honest",
]

DEEP_SAYINGS = [
    r"\bat its core\b", r"\bthe real question is\b", r"\bwhat really matters\b",
    r"\bthe heart of the matter\b", r"\bis the (?:language|currency|architecture) of\b",
]

RULES = {
    # hard rules
    "dash": ("hard", re.compile(r"—|–|(?<=\S) -- (?=\S)|\s--\s")),
    "not-x-but-y": ("hard", re.compile(
        r"\b(?:not|isn'?t|aren'?t|wasn'?t|it'?s not)\s+(?:just|only|merely|simply|about)?\s*[^.?!;:]{1,60}?[,;]?\s+but\s+(?:rather\s+)?(?:also\s+)?", re.I)),
    "not-x-its-y": ("hard", re.compile(r"\b(?:it'?s|this is|that'?s) not [^.?!]{1,60}?[,.] (?:it'?s|this is|that'?s)\b", re.I)),
    "chat-residue": ("hard", re.compile("|".join(CHAT_RESIDUE), re.I)),
    "run-up": ("hard", re.compile("|".join(RUN_UP), re.I)),
    "deep-saying": ("hard", re.compile("|".join(DEEP_SAYINGS), re.I)),
    "stock-word": ("hard", re.compile(r"\b(?:" + "|".join(re.escape(w) for w in STOCK_WORDS) + r")\b", re.I)),
    "bold-label": ("hard", re.compile(r"^\s*(?:[-*+]|\d+[.)])\s+\*\*[^*\n]+?(?::\*\*|\*\*\s*:)", re.M)),
    "emoji-heading": ("hard", re.compile(r"^#{1,6}\s*[\U0001F300-\U0001FAFF☀-➿]", re.M)),
    # advisory rules
    "sales-word": ("advisory", re.compile(r"\b(?:" + "|".join(re.escape(w) for w in SALES_WORDS) + r")\b", re.I)),
    "title-case-heading": ("advisory", re.compile(r"^#{1,6}\s+(?:[A-Z][a-z]+\s+){2,}[A-Z][a-z]+\s*$", re.M)),
    "stacked-qualifier": ("advisory", re.compile(r"\b(?:could|might|may)\s+(?:potentially|possibly|arguably)\s+(?:potentially|possibly|arguably|be)\b", re.I)),
    "serves-as": ("advisory", re.compile(r"\b(?:serves as|stands as|functions as|boasts|represents a)\b", re.I)),
    "closer": ("advisory", re.compile(r"^(?:That is the real win|That distinction matters|Read that again|Let that sink in)\.?\s*$", re.M | re.I)),
    "repeated-closer": ("advisory", None),
}

FENCE = re.compile(r"^\s*(```|~~~)")
INLINE_CODE = re.compile(r"`[^`\n]*`")
URL = re.compile(r"https?://\S+|\S+/\S+")


def strip_code(text):
    out, fenced = [], False
    for line in text.splitlines():
        if FENCE.match(line):
            fenced = not fenced
            out.append("")
            continue
        if fenced:
            out.append("")
            continue
        line = INLINE_CODE.sub(" ", line)
        line = URL.sub(" ", line)
        out.append(line)
    return "\n".join(out)


def line_of(text, pos):
    return text.count("\n", 0, pos) + 1


def lint(text, disabled=()):
    clean = strip_code(text)
    findings = []
    for name, (level, rx) in RULES.items():
        if name in disabled or rx is None:
            continue
        for m in rx.finditer(clean):
            findings.append({
                "rule": name, "level": level,
                "line": line_of(clean, m.start()),
                "match": m.group(0).strip()[:80],
            })
    if "repeated-closer" not in disabled:
        paras = [p.strip() for p in re.split(r"\n\s*\n", clean) if p.strip()]
        one_liners = [p for p in paras if len(p) < 60 and "\n" not in p and not p.startswith("#")]
        seen = {}
        for p in one_liners:
            seen[p] = seen.get(p, 0) + 1
        for p, n in seen.items():
            if n >= 2:
                findings.append({"rule": "repeated-closer", "level": "advisory",
                                 "line": line_of(clean, clean.find(p)), "match": p})
    findings.sort(key=lambda f: (f["line"], f["rule"]))
    return findings


def selftest():
    bad = ("It's not just a tool, it's a mirror. The policy — announced today — applies. "
           "Great question! Let's dive in. At its core it is robust and seamless.\n"
           "- **Speed:** fast\n")
    good = "The request may have failed. Check the client version. The tool shows your habits."
    f_bad = {f["rule"] for f in lint(bad)}
    f_good = lint(good)
    want = {"not-x-its-y", "dash", "chat-residue", "run-up", "deep-saying", "stock-word", "bold-label"}
    missing = want - f_bad
    assert not missing, f"selftest: missing {missing}"
    assert not f_good, f"selftest: false positive on hedge text: {f_good}"
    print("selftest ok")


def main(argv):
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument("files", nargs="*")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--baseline", type=int, default=0)
    ap.add_argument("--disable", default="")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args(argv)
    if a.selftest:
        selftest()
        return 0
    disabled = {d.strip() for d in a.disable.split(",") if d.strip()}
    unknown = disabled - set(RULES)
    if unknown:
        print(f"unknown rule(s): {', '.join(sorted(unknown))}", file=sys.stderr)
        return 2
    sources = []
    if a.files:
        for p in a.files:
            try:
                with open(p, encoding="utf-8") as fh:
                    sources.append((p, fh.read()))
            except OSError as e:
                print(f"cannot read {p}: {e}", file=sys.stderr)
                return 2
    else:
        sources.append(("<stdin>", sys.stdin.read()))
    hard = 0
    report = []
    for name, text in sources:
        fs = lint(text, disabled)
        hard += sum(1 for f in fs if f["level"] == "hard")
        report.append({"file": name, "findings": fs})
        if not a.json:
            for f in fs:
                print(f"{name}:{f['line']}: [{f['level']}] {f['rule']}: {f['match']}")
    if a.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(f"{hard} hard finding(s), baseline {a.baseline}")
    return 1 if hard > a.baseline else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
