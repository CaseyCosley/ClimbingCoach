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
banned = re.compile(r"\b(safe|safety|safely)\b", re.I)
for n in ("activities", "vocabulary", "curricula", "playbook", "pages", "meta"):
    for m in banned.finditer((D / f"{n}.json").read_text(encoding="utf-8")):
        errors.append(f"{n}.json: banned word '{m.group(0)}' (write about managing risk instead)")
print(f"{len(acts['items'])} activities, {len(voc['items'])} terms, {weeks} weekly plans, {len(src['library'])} library sources")
if errors:
    print(f"{len(errors)} problem(s):"); [print(" -", e) for e in errors]; sys.exit(1)
print("OK: no duplicates, all references resolve, no banned words.")
