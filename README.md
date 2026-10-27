# Youth Climbing Coaching Hub

A static website (plain HTML, CSS and JavaScript, no build step, no server code, no external dependencies) with youth climbing curricula for seven age groups, 280 week-by-week plans, an activity library and a vocabulary glossary.

## Run it locally

The pages load their content from `data/*.json`, and browsers block that when a file is opened straight from disk. Serve the folder with any static server:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Serve this repository's root (where `index.html` lives).

## Hosting

Upload the folder as is to GitHub Pages, Netlify, Cloudflare Pages or any static host. All links are relative, so it also works from a subfolder. `.nojekyll` stops GitHub Pages from processing the files.

## Hosting on GitHub Pages

In the repository: **Settings > Pages > Build and deployment > Source: Deploy from a branch**, **Branch: main**, folder **/** (root).

Pages then serves this site at `https://caseycosley.github.io/ClimbingCoach/`. Asset and data paths are relative (`assets/...`, `data/...`), so they resolve under that project path.

## Files

| Path | What it is |
|---|---|
| `index.html` | Home: what this is, who it's for, the key principles, links to each age group |
| `curricula.html` | Group dropdown and a view switcher (`?group=&view=&month=&week=`). Default is this week's lesson card for today's date (week 1 outside September–June); Roadmap is next, then month cards, the skill ladder, and the full table |
| `library.html` / `activity.html#<id>` | Activity search and filters / one activity's page (shareable URL) |
| `vocabulary.html` / `term.html#<id>` | Glossary search and category filter / one term's page |
| `playbook.html` | Research by age group, comparison table, game-theory section, sources |
| `about.html` | About, the managing-risk language note, dedup rules, all sources |
| `assets/css/style.css` | All styles, including mobile, dark mode and print |
| `assets/js/*.js` | `common.js` (header, footer, data loading, helpers) plus one script per page |
| `data/*.json` | All content (see below) |
| `tools/validate.py` | Checks the data before you publish |

## Data files

The HTML holds no content. Change the JSON files and the site updates.

- **`data/activities.json`**: `{ lastUpdated, count, items: [...] }`. Each activity has these fields:
  - `id`: the URL slug
  - `name`
  - `aka`: also-called aliases
  - `types`: session types; ids are listed in `meta.json`
  - `skills`: free-text skill tags
  - `ages`: `parent-child ages-3-4 ages-4-6 ages-6-9 ages-9-12 ages-12-plus ages-14-plus`
  - `themes`: `rope tech str event fun`
  - `setup`
  - `steps`: an array
  - `why`
  - `variations`
  - `risk`: risk management
  - `sources`: keys into `sources.json` → `library`, or `"CP"` for coaching practice
- **`data/vocabulary.json`**: `{ lastUpdated, count, items: [...] }`. Each term has these fields:
  - `id`
  - `name`
  - `aka`
  - `category`
  - `definition`: the plain definition, for coaches and teens
  - `kid`: for Ages 6–9 and Ages 9–12
  - `little`: for Parent & Child (ages 2–3), Ages 3–4 and Ages 4–6
  - `demo`: how to teach it
- **`data/curricula.json`** has three parts:
  - `categories`: chart colors and legend labels
  - `groups`: one per age group, each with:
    - `id`, `ageId`, `name`, `minutes`
    - `types`: the default weekly structure
    - `intro`
    - `months`: the chart rows, each with month, theme, color category and weeks as [skill, optional session type]
    - `session`: the typical session steps
    - `notes`
    - `blocks`: timed blocks that add up to the class length; the slot is W (warm-up), D (drill), G (game), C (cool-down) or B (break)
    - `vocabLevel`
    - `gamesByMonth`
    - `plan`: the authored weekly source data
    - `weeks`: the 40 finished weekly plans
  - `weekVocab`: the definitions used in the week tables, as [for you, kid, little kid]
- **`data/sources.json`**:
  - `library`: activity sources by key
  - `playbook`: the numbered Playbook sources; `[n]` in the Playbook text points to item n
  - `coachingPractice`: the label used for uncited entries
- **`data/playbook.json`**: the Playbook text (principles, game theory, comparison, the seven age-group sections, evidence gaps).
- **`data/pages.json`**: the intro text for the Library and Curricula pages, and the dedup steps.
- **`data/meta.json`**: last-updated date, age groups, month themes and session types (the filter options).

The footer and Home counts are computed from the data, so they never need editing.

## Dedup rules (from the Library)

1. **Normalize the name.** Lowercase it and strip spaces, hyphens and punctuation (“Add-On” and “add on” both become “addon”). Compare against every existing name and every “also called” alias.
2. **Compare the core rule, not the name.** Write the game in one sentence (what the climber does, and what wins or ends a round). If an existing entry has the same core rule, it is a duplicate even with a different name: add the new name to that entry's aliases and add its source.
3. **Variants go inside the parent entry.** A scoring change, a theme, a prop swap or an age tweak (letters for falls, a dice roll, a board version) is a variation of the parent entry, not a new entry. Only a different core rule or a different purpose earns its own entry.
4. **Same name, different game.** If two sources use one name for two different games, give each a descriptive unique name and keep the source's name as an alias with a qualifier.
5. **Cite or mark it.** Every new entry links the page it came from, or is marked coaching practice. Never invent a source.
6. **Use risk language.** Write about managing and reducing risk, never as if any activity were free of risk; keep source titles verbatim.
7. **Update the counts.** Bump the last-updated date. The counts update themselves from the data.

Names are compared after lowercasing and removing everything except letters and digits. Activities and vocabulary are checked separately, so a term can share a name with an activity alias (for example the term Quiet Feet and the activity Silent Feet). Search uses the same normalizing, so you don't need aliases that only differ by punctuation.

## Adding entries (daily updates)

1. Search the Library or Vocabulary page for the new name, its aliases and its core rule. If it already exists, add the new name to `aka` and the new source key to `sources` instead of making a new entry.
2. Append a new object to `items` in `data/activities.json` or `data/vocabulary.json`. The `id` must be unique: lowercase, with words joined by hyphens. Example activity:

```json
{
 "id": "pulse-raiser",
 "name": "Pulse Raiser",
 "aka": [
  "Get-Warm Jog"
 ],
 "types": [
  "warm-up",
  "off-wall"
 ],
 "skills": [
  "mobility",
  "listening"
 ],
 "ages": [
  "parent-child",
  "ages-3-4",
  "ages-4-6",
  "ages-6-9",
  "ages-9-12",
  "ages-12-plus",
  "ages-14-plus"
 ],
 "themes": [
  "rope",
  "tech",
  "str",
  "event",
  "fun"
 ],
 "setup": "Open floor away from the climbing wall's fall zones.",
 "steps": [
  "2–5 minutes of jogging, skipping, star jumps or high knees.",
  "Build the pace gradually until everyone is warm and slightly out of breath.",
  "Finish standing still so the group is ready to listen."
 ],
 "why": "BMC's FUNdamentals notes build a climbing warm-up in three parts: pulse raiser, joint rotation, then easy climbing. Raising heart rate and body temperature first prepares muscles and gets attention on you.",
 "variations": "Parent & Child (ages 2–3) to Ages 4–6: tell a story (run from the rain, jump the puddles). Ages 6–9 and Ages 9–12: follow-the-leader or a tag game. Ages 12+ (training) and Ages 14+ (competitive): athlete-led.",
 "risk": "Keep running lanes clear of bags, ropes and the landing zones under climbers.",
 "sources": [
  "BMC",
  "MT"
 ]
}
```

Example term:

```json
{
 "id": "hold",
 "name": "Hold",
 "aka": [
  "Climbing Hold"
 ],
 "category": "Holds",
 "definition": "Any shaped grip bolted to the wall for hands or feet.",
 "kid": "The bumps on the wall you grab or stand on.",
 "little": "The wall's handles and steps.",
 "demo": "Touch three holds and name their colors."
}
```

3. For a new published source, add it to `sources.json` → `library` under a short key with `title`, `site` and `href`, keeping the title exactly as published. Never invent a source; use `"CP"` (coaching practice) when there isn't one.
4. Write about managing and reducing risk. Avoid any word that suggests an activity is free of risk (the validator lists the banned words), except inside a source's title or URL.
5. Change `lastUpdated` in `activities.json`, `vocabulary.json` and `meta.json` to today's date.
6. Run `python3 tools/validate.py`. It checks for duplicate names or aliases, unknown ages, types, themes or source keys, weekly plans that use a name not in the library or not listed for that age, blocks that don't add up to the class length, and banned words.

New entries appear in the Library and Vocabulary right away. Weekly plans only change if you edit `curricula.json`; `validate.py` checks any edits there.
