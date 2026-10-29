#!/usr/bin/env python3
"""Check the data files before publishing: duplicates, broken references, banned words.
Run from the site folder:  python3 tools/validate.py
"""
import json, re, sys, pathlib
D = pathlib.Path(__file__).resolve().parent.parent / "data"
load = lambda n: json.loads((D / f"{n}.json").read_text(encoding="utf-8"))
nz = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
acts, voc, cur, src, meta = (load(n) for n in ("activities", "vocabulary", "curricula", "sources", "meta"))
errors = []

def dedup(items, label):
    seen, ids = {}, set()
    for it in items:
        if it["id"] in ids: errors.append(f"{label}: duplicate id {it['id']}")
        ids.add(it["id"])
        for n in [it["name"]] + it.get("aka", []):
            k = nz(n)
            if k in seen and seen[k] != it["name"]:
                errors.append(f"{label}: '{n}' ({it['name']}) duplicates '{seen[k]}'")
            elif k in seen and n != it["name"]:
                errors.append(f"{label}: alias '{n}' is the same as its own name after normalizing; remove it")
            seen[k] = it["name"]
    return seen

A = dedup(acts["items"], "activities"); V = dedup(voc["items"], "vocabulary")
ages = {a["id"] for a in meta["ages"]}; types = {t["id"] for t in meta["types"]}; themes = {t["id"] for t in meta["themes"]}
need = ["id", "name", "aka", "types", "skills", "ages", "themes", "setup", "steps", "why", "variations", "risk", "sources"]
for a in acts["items"]:
    for f in need:
        if f not in a: errors.append(f"activity {a.get('name')}: missing {f}")
    for x in a.get("ages", []):
        if x not in ages: errors.append(f"activity {a['name']}: unknown age {x}")
    for x in a.get("types", []):
        if x not in types: errors.append(f"activity {a['name']}: unknown type {x}")
    for x in a.get("themes", []):
        if x not in themes: errors.append(f"activity {a['name']}: unknown theme {x}")
    for s in a.get("sources", []):
        if s != "CP" and s not in src["library"]: errors.append(f"activity {a['name']}: unknown source key {s} (use CP for coaching practice)")
for v in voc["items"]:
    for f in ["id", "name", "aka", "category", "definition", "kid", "little", "demo"]:
        if f not in v: errors.append(f"term {v.get('name')}: missing {f}")
byname = {a["name"]: a for a in acts["items"]}
weeks = 0
for g in cur["groups"]:
    total = sum(b["min"] for b in g["blocks"])
    if total != g["minutes"]: errors.append(f"{g['name']}: blocks add to {total}, class is {g['minutes']}")
    for w in g["weeks"]:
        weeks += 1
        for n in (w["warm"], w["drill"], w["game"], w["cool"]):
            if n not in byname: errors.append(f"{g['name']} week {w['n']}: activity '{n}' not in library (exact name)")
            elif g["ageId"] not in byname[n]["ages"]: errors.append(f"{g['name']} week {w['n']}: '{n}' not listed for {g['ageId']}")
        for t in w["vocab"]:
            if nz(t) not in V: errors.append(f"{g['name']} week {w['n']}: term '{t}' not in vocabulary")
            if t not in cur["weekVocab"]: errors.append(f"{g['name']} week {w['n']}: term '{t}' missing from weekVocab")
# Competitive games, contact games, water blocks, risk-free wording, and gym branding.
# The allowlist is only for uses that are not those games. Each entry says why.
game_flag = re.compile("|".join([
    r"\btag\w*",
    r"\bchase\w*",
    r"\brace\w*",
    r"\brelay\b",
    r"\bdodge\w*",
    r"\beliminat\w*",
    r"\bstep out\b",
    r"\byou'?re out\b",
    r"\bis out\b",
    r"\blast (?:one|climber) (?:standing|on)\b",
    r"\bwinner\b",
    r"\bwins\b",
    r"\bfirst to\b",
    r"\bfastest\b",
    r"\bwho holds\b",
    r"\bwho can name\b",
    r"\bpoints\b",          # a score; not the verb "point"
    r"\ba point\b",
    r"\bscore\w*",
    r"\bbrackets?\b",
    r"\bmarch madness\b",
    r"\bcomp sim\b",
    r"\bmock comp\b",
    r"\bversus\b",
    r"\bvs\.?\b",
    r"\bking of\b",
    r"\b(?:whoever|who) is it\b",
    r"\byou(?:'re| are) it\b",
    r"\bwater break\b",
    r"\bhydration\b",
    r"\b(?:safe|safety|safely)\b",
    r"vertical\s*world",
    r"verticalworld",
    r"rockin",
    r"pebbles",
    r"little rockers",
    r"base club",
    r"ascent club",
    r"summit club",
    r"parent\s*&\s*me",
    r"parent and me",
    r"homeschool",
]), re.I)
game_allow = [
    re.compile(p, re.I) for p in [
        r"grade tags",                 # paper labels on route cards
        r"paper tags",
        r"all tags",
        r"tags keep",
        r"tag by theme",
        r"no tag, no problem",         # hiding the grade, not a tag game
        r"tagged routes",
        r"tagged holds",               # the marked start holds of a route
        r"start tag",
        r"three points",               # three points of contact
        r"three-points",               # id slug for that term
        r"tie-in-points",              # id slug for the harness hardware
        r"four points",
        r"tie-in points",              # harness hardware
        r"halfway points",             # the Zone hold, a real comp term
        r"harness points",
        r"points to",                  # the verb, as in "points to the next hold"
        r"side points",
        r"slow sloth vs\.? quick frog",  # two ways to move, not two climbers
        r"slow & smooth vs\.? quick",
        r"static vs\.? dynamic",
        r"onsight vs\.? redpoint",
        r"open-hand vs",
        r"hips low vs",
        r"hips out vs",
        r"tight vs slack",
        r"wiggle zone[’']? vs",
        r"self vs\.? self",            # personal best
        r"documents/safety/",          # published source URL; keep it verbatim
    ]
]
def scrub(text):
    for pat in game_allow:
        text = pat.sub(" ", text)
    return text
root = pathlib.Path(__file__).resolve().parent.parent
scan = list(D.glob("*.json")) + [root / "README.md"] + list(root.glob("*.html"))
for path in scan:
    text = scrub(path.read_text(encoding="utf-8"))
    for m in game_flag.finditer(text):
        line = text[:m.start()].count("\n") + 1
        errors.append(f"{path.name}:{line}: competitive, contact, branding, or banned wording '{m.group(0)}'")
print(f"{len(acts['items'])} activities, {len(voc['items'])} terms, {weeks} weekly plans, {len(src['library'])} library sources")
if errors:
    print(f"{len(errors)} problem(s):"); [print(" -", e) for e in errors]; sys.exit(1)
print("OK: no duplicates, all references resolve, no banned words, no competitive game wording.")
