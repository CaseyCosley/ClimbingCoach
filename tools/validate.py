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
byid = {a["id"]: a for a in acts["items"]}
weeks = 0
for g in cur["groups"]:
    total = sum(b["min"] for b in g["blocks"])
    if total != g["minutes"]: errors.append(f"{g['name']}: blocks add to {total}, class is {g['minutes']}")
    warm = [b for b in g["blocks"] if b["slot"] == "W"]
    if any(b["slot"] == "C" for b in g["blocks"]):
        errors.append(f"{g['name']}: cool-down is not a scheduled block")
    if len(warm) != 1 or warm[0]["min"] != 5:
        errors.append(f"{g['name']}: warm-up block should be 5 minutes")
    for s in g.get("session", []):
        blob = s.get("title", "") + " " + s.get("detail", "")
        if re.search(r"cool-?down", blob, re.I):
            errors.append(f"{g['name']} session: still mentions a cool-down ({s.get('title')})")
        if re.search(r"warm-up,\s*(?!5\b)\d+", blob, re.I):
            errors.append(f"{g['name']} session: warm-up is not 5 minutes ({s.get('title')})")
    for w in g["weeks"]:
        weeks += 1
        for n in (w["warm"], w["drill"], w["game"], w["cool"]):
            if n not in byname: errors.append(f"{g['name']} week {w['n']}: activity '{n}' not in library (exact name)")
            elif g["ageId"] not in byname[n]["ages"]: errors.append(f"{g['name']} week {w['n']}: '{n}' not listed for {g['ageId']}")
        for t in w["vocab"]:
            if nz(t) not in V: errors.append(f"{g['name']} week {w['n']}: term '{t}' not in vocabulary")
            if t not in cur["weekVocab"]: errors.append(f"{g['name']} week {w['n']}: term '{t}' missing from weekVocab")
        focus = w.get("focusActivities")
        learnings = w.get("learnings")
        if not isinstance(focus, list) or not 2 <= len(focus) <= 3:
            errors.append(f"{g['name']} week {w['n']}: focusActivities must list 2 or 3 activity ids")
        else:
            for aid in focus:
                act = byid.get(aid)
                if not act:
                    errors.append(f"{g['name']} week {w['n']}: focusActivities id '{aid}' does not resolve")
                else:
                    if g["ageId"] not in act["ages"]:
                        errors.append(f"{g['name']} week {w['n']}: focus activity '{aid}' not listed for {g['ageId']}")
                    if "lead" in (act.get("discipline") or []) and g["ageId"] not in ("ages-12-plus", "ages-14-plus"):
                        errors.append(f"{g['name']} week {w['n']}: lead focus '{aid}' is only for ages 12+ and 14+")
        if not isinstance(learnings, list) or not 2 <= len(learnings) <= 4 or any(not isinstance(x, str) or not x.strip() for x in learnings):
            errors.append(f"{g['name']} week {w['n']}: learnings must be 2 to 4 short cues")
pb = load("playbook"); pages = load("pages")
shape_text = []
for gpb in pb["groups"]:
    for prop in gpb["props"]:
        if prop.get("label") == "Session shape":
            shape_text.append(("playbook " + gpb["name"], prop.get("value", "")))
for item in pages.get("curricula", {}).get("how", []):
    shape_text.append(("pages curricula", item))
for view in pages.get("curricula", {}).get("views", []):
    shape_text.append(("pages view " + view.get("name", ""), view.get("text", "")))
root = pathlib.Path(__file__).resolve().parent.parent
for label, path in (("about.html", root / "about.html"), ("README", root / "README.md")):
    shape_text.append((label, path.read_text(encoding="utf-8")))
for label, blob in shape_text:
    if re.search(r"cool-?down", blob, re.I):
        errors.append(f"{label}: still mentions a cool-down block")
    if re.search(r"warm-up,?\s+(10|15|20)\s*min", blob, re.I):
        errors.append(f"{label}: still describes a warm-up longer than 5 minutes")
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
        r"\bpoints\b(?!\s+(?:with|to|at))",  # a score; not the verb "points to/with"
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
        r"both-points",                # filename of the Petzl two-point tie-in figure
        r"four points",
        r"tie-in points",              # harness hardware
        r"halfway points",             # the Zone hold, a real comp term
        r"harness points",
        r"hard points",                # harness hardware, not a score
        r"attachment points",
        r"clip-in points",
        r"connection points",
        r"points of contact",
        r"coach points",
        r"climber points",
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
        r"not a race",                 # a warning against a race, not a race game
        r"not a chase",                # a warning against a chase, not a chase game
        r"into an elimination",        # tells the coach not to make an elimination game
        r"documents/safety/",          # published source URL; keep it verbatim
    ]
]
def scrub(text):
    for pat in game_allow:
        text = pat.sub(" ", text)
    return text
DISC = {"bouldering", "auto-belay", "top-rope", "lead"}
LEAD_AGES = {"ages-12-plus", "ages-14-plus"}
for a in acts["items"]:
    if "discipline" not in a or not isinstance(a["discipline"], list) or not a["discipline"]:
        errors.append(f"activity {a['name']}: discipline must be a non-empty list")
    else:
        for x in a["discipline"]:
            if x not in DISC: errors.append(f"activity {a['name']}: unknown discipline {x}")
        if "lead" in a["discipline"] and any(x not in LEAD_AGES for x in a["ages"]):
            errors.append(f"activity {a['name']}: lead is only for ages 12+ and 14+")
    if "prereqs" not in a or not isinstance(a["prereqs"], list):
        errors.append(f"activity {a['name']}: prereqs must be a list")
    elif "auto-belay" in a.get("discipline", []) and not any("staff permission" in p.lower() for p in a["prereqs"]):
        errors.append(f"activity {a['name']}: auto belay requires a staff-permission prerequisite")
for v in voc["items"]:
    if "discipline" not in v or not isinstance(v["discipline"], list) or not v["discipline"]:
        errors.append(f"term {v.get('name')}: discipline must be a non-empty list")
    else:
        for x in v["discipline"]:
            if x not in DISC: errors.append(f"term {v.get('name')}: unknown discipline {x}")
term_ids = {v["id"] for v in voc["items"]}
IMG_NEED = ("src", "alt", "credit", "sourceUrl", "license", "licenseUrl")
def check_images(item, label):
    for im in item.get("images") or []:
        if not isinstance(im, dict):
            errors.append(f"{label}: image must be an object")
            continue
        for k in IMG_NEED:
            if not im.get(k):
                errors.append(f"{label}: image missing {k}")
        src = im.get("src") or ""
        if src and not (root / src).is_file():
            errors.append(f"{label}: image file missing {src}")
for a in acts["items"]:
    check_images(a, f"activity {a['name']}")
for v in voc["items"]:
    check_images(v, f"term {v.get('name')}")
    for rel in v.get("relatedTerms") or []:
        if rel not in term_ids:
            errors.append(f"term {v.get('name')}: relatedTerms id '{rel}' does not resolve")
ids = {a["id"] for a in acts["items"]}
try:
    ropes = load("rope-lessons")
except Exception as exc:
    errors.append(f"rope-lessons.json: {exc}")
    ropes = {"items": []}
for L in ropes.get("items", []):
    if L.get("discipline") not in DISC:
        errors.append(f"rope lesson {L.get('title')}: unknown discipline")
    if L.get("discipline") == "lead" and L.get("ageId") not in LEAD_AGES:
        errors.append(f"rope lesson {L.get('title')}: lead is only for ages 12+ and 14+")
    if L.get("warmup", {}).get("minutes") != 5:
        errors.append(f"rope lesson {L.get('title')}: warm-up must be 5 minutes")
    total = L.get("warmup", {}).get("minutes", 0) + sum(b.get("minutes", 0) for b in L.get("blocks", []))
    if total != L.get("minutes"):
        errors.append(f"rope lesson {L.get('title')}: blocks add to {total}, lesson is {L.get('minutes')}")
    for ref in L.get("warmup", {}).get("activityIds", []):
        if ref not in ids: errors.append(f"rope lesson {L.get('title')}: unknown activity id {ref}")
    for b in L.get("blocks", []):
        for ref in b.get("activityIds", []):
            if ref not in ids: errors.append(f"rope lesson {L.get('title')}: unknown activity id {ref}")
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
