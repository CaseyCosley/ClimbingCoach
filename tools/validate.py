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
# Warm-up minutes by group, sized to class length on the model in The Science of Climbing Training, Ch 8 and 9:
# 5 for the 60-minute classes, 8 for the 90-minute class, 12-18 for the 120-minute classes.
WARM = {"parent-child": 5, "ages-3-4": 5, "ages-4-6": 5, "ages-6-9": 8, "ages-9-12": 12, "ages-12-plus": 15, "ages-14-plus": 18}
TEEN = {"ages-12-plus", "ages-14-plus"}
# Finger rule (book, Ch 8: under 16, no maximal-weight or minimum-edge protocols): bar hangs and low-intensity 24 mm
# three-pad hangs for Ages 12+ and 14+ only. Never campus, added weight, one-arm, minimum-edge or max-weight work.
FINGERBOARD = re.compile(r"\b(?:hangboard\w*|fingerboard\w*|three-pad|24 ?mm)\b", re.I)
FINGER_NEVER = re.compile(r"\b(?:campus\w*|weighted (?:hang|pull)\w*|added weight|weight vest|one-arm hang\w*|minimum[- ]edge|max(?:imum)?[- ]weight)\b", re.I)
NEGATED = re.compile(r"\b(?:no|not|never|without|avoid|skip|instead of|isn't|aren't|don't|do not)\b[^.;]*$", re.I)

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
        if x == "cool-down": errors.append(f"activity {a['name']}: cool-down is not a type in this program")
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
    target = WARM.get(g["ageId"])
    if target is None: errors.append(f"{g['name']}: no warm-up target for {g['ageId']}")
    elif len(warm) != 1 or warm[0]["min"] != target:
        errors.append(f"{g['name']}: warm-up block should be {target} minutes")
    for s in g.get("session", []):
        blob = s.get("title", "") + " " + s.get("detail", "")
        if re.search(r"cool-?down", blob, re.I):
            errors.append(f"{g['name']} session: still mentions a cool-down ({s.get('title')})")
        m = re.search(r"warm-up,\s*(\d+)", blob, re.I)
        if m and int(m.group(1)) != target:
            errors.append(f"{g['name']} session: warm-up is not {target} minutes ({s.get('title')})")
    for w in g["weeks"]:
        weeks += 1
        if "cool" in w: errors.append(f"{g['name']} week {w['n']}: cool-down is not a scheduled block (remove 'cool')")
        wu = w.get("warmup") or {}
        parts = wu.get("parts") or []
        if wu.get("minutes") != target or sum(p_.get("minutes", 0) for p_ in parts) != target:
            errors.append(f"{g['name']} week {w['n']}: warm-up parts must add to {target} minutes")
        for p_ in parts:
            act = byid.get(p_.get("activityId"))
            if not act: errors.append(f"{g['name']} week {w['n']}: warm-up part id '{p_.get('activityId')}' does not resolve")
            else:
                if g["ageId"] not in act["ages"]: errors.append(f"{g['name']} week {w['n']}: warm-up part '{act['id']}' not listed for {g['ageId']}")
                if nz(act["id"]) != nz(act["name"]): errors.append(f"warm-up part '{act['id']}': id and name must match after normalizing (usage index)")
        for n in (w["warm"], w["drill"], w["game"]):
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
    if re.search(r"\b5-minute warm-up\b|warm-up \(5 min|warm-up, 5 minutes|warm-up is about 5 minutes", blob, re.I) and label not in ("playbook Parent & Child", "playbook Ages 3–4", "playbook Ages 4–6"):
        errors.append(f"{label}: still describes one 5-minute warm-up for every group")
gshape = {gpb["id"]: gpb for gpb in pb["groups"]}
for gid, target in WARM.items():
    gpb = gshape.get(gid)
    shape = " ".join(pr.get("value", "") for pr in (gpb or {}).get("props", []) if pr.get("label") == "Session shape")
    nums = [int(x) for x in re.findall(r"(\d+)[- ]minute (?:\w+[- ])*?warm-up|warm-up is about (\d+)", shape) for x in x if x] if shape else []
    if shape and nums and target not in nums: errors.append(f"playbook {gid}: Session shape warm-up should be about {target} minutes")
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
        r"active vs passive flexibility",  # a section heading in The Science of Climbing Training; citations keep it verbatim
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
# Story games depend on a coach inventing a plot. Flag them in names and how-to text.
# The allowlist is only for a concrete picture inside an otherwise structured drill.
story_flag = re.compile(r"\b(?:story|stories|pretend\w*|imagin\w*|adventure|once upon)\b", re.I)
story_allow = [re.compile(p, re.I) for p in [
    r"adventurebooks\.com",  # publisher URL, not a story game
]]
def story_scrub(text):
    for pat in story_allow:
        text = pat.sub(" ", text)
    return text
for a in acts["items"]:
    how = "\n".join([a.get("name") or "", a.get("setup") or "", a.get("why") or "", a.get("variations") or ""] + list(a.get("steps") or []))
    how = story_scrub(how)
    for m in story_flag.finditer(how):
        errors.append(f"activity {a['name']}: story-game wording '{m.group(0)}'")
    core = " ".join([a.get("setup", "")] + a.get("steps", []))
    for m in FINGER_NEVER.finditer(core):
        if not NEGATED.search(core[max(0, core.rfind(".", 0, m.start()) + 1):m.start()]):
            errors.append(f"activity {a['name']}: campus, weighted, one-arm or maximal finger work ('{m.group(0)}') is not used in any group")
    if FINGERBOARD.search(core):
        if not set(a["ages"]) <= TEEN:
            errors.append(f"activity {a['name']}: fingerboard hangs are only for Ages 12+ and 14+")
        if not re.search(r"24 ?mm|three-pad", core, re.I):
            errors.append(f"activity {a['name']}: fingerboard hangs must use the 24 mm three-pad edge")
        if not any("warm-up" in x.lower() for x in a.get("prereqs", [])):
            errors.append(f"activity {a['name']}: fingerboard hangs need a full warm-up prerequisite")
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
    if L.get("warmup", {}).get("minutes") != WARM.get(L.get("ageId")):
        errors.append(f"rope lesson {L.get('title')}: warm-up must be {WARM.get(L.get('ageId'))} minutes for {L.get('ageId')}")
    total = L.get("warmup", {}).get("minutes", 0) + sum(b.get("minutes", 0) for b in L.get("blocks", []))
    if total != L.get("minutes"):
        errors.append(f"rope lesson {L.get('title')}: blocks add to {total}, lesson is {L.get('minutes')}")
    for ref in L.get("warmup", {}).get("activityIds", []):
        if ref not in ids: errors.append(f"rope lesson {L.get('title')}: unknown activity id {ref}")
    for b in L.get("blocks", []):
        for ref in b.get("activityIds", []):
            if ref not in ids: errors.append(f"rope lesson {L.get('title')}: unknown activity id {ref}")
for k, s_ in src["library"].items():
    if not s_.get("title") or not (s_.get("site") or s_.get("author")): errors.append(f"source {k}: needs a title and a site or author")
def check_cites(lst, label):
    for c in lst or []:
        if isinstance(c, dict) and c.get("publisher") and not c.get("chapter"):
            errors.append(f"{label}: book citation needs a chapter")
for a in acts["items"]:
    check_cites(a.get("researchSources"), f"activity {a['name']}")
for v in voc["items"]:
    check_cites(v.get("sources"), f"term {v.get('name')}")
for gpb in pb["groups"]:
    if gpb["id"] not in ages: errors.append(f"playbook group {gpb['id']}: unknown age id")
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
