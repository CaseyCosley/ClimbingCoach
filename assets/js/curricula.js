(function () {
  "use strict";
  var H = window.Hub, esc = H.esc;
  H.init("curricula.html");
  var VIEWS = {
    lesson: "One class on a single card: timed blocks, vocabulary, and a cue for each part. Print it and take it to the wall.",
    roadmap: "Ten month stops for the year. Each card shows the theme and a one-line focus. Open a month for its four weeks.",
    months: "One card per month, with the skills, a few vocabulary chips, and the weeks as tabs.",
    ladder: "Each theme is a lane. Read across the year to see how the skills step up, then open any week.",
    table: "The full grid: month, theme, skill progression, and weekly structure, with the week plan underneath."
  };
  var FOCUS = {
    W: function () { return "Raise heart rate and loosen joints before climbing."; },
    D: function (r) { return "Teach: " + r.skill + "."; },
    G: function () { return "Reward this week's skill, not just reaching the top."; },
    C: function () { return "Recover, then each climber names one thing they got better at."; },
    B: function () { return "Rest fingers, then a quick show-me of the skill."; }
  };

  H.loadAll(["curricula", "activities", "vocabulary", "pages"]).then(function (d) {
    var cur = d.curricula, P = d.pages.curricula, CAT = cur.categories;
    var aIdx = H.indexByName(d.activities.items), vIdx = H.indexByName(d.vocabulary.items);
    var la = function (n) { return H.linkName(n, aIdx, H.actHref); };
    var lv = function (n) { return H.linkName(n, vIdx, H.termHref); };
    function weekInSeason(dt) {
      var s = H.seasonWeek(dt);
      return s.outside ? null : s;
    }
    function readParams(search) {
      var params = new URLSearchParams(search);
      var named = cur.groups.some(function (g) { return g.id === params.get("group"); });
      var m, w;
      if (params.has("month") || params.has("week")) {
        m = parseInt(params.get("month"), 10);
        w = parseInt(params.get("week"), 10);
        if (isNaN(m)) m = 0;
        if (isNaN(w)) w = 1;
        m = Math.min(9, Math.max(0, m));
        w = Math.min(3, Math.max(0, w - 1));
      } else {
        var now = weekInSeason(new Date());
        m = now ? now.m : 0;
        w = now ? now.w : 0;
      }
      return {
        g: named ? params.get("group") : cur.groups[0].id,
        view: VIEWS[params.get("view")] ? params.get("view") : "lesson",
        m: m,
        w: w
      };
    }
    var state = readParams(location.search);
    state.road = state.m;
    state.tabs = {};
    state.date = "";
    state.dateNote = "";
    if (location.hash === "#week-section") state.view = "lesson";

    var gsel = document.getElementById("group");
    var host = document.getElementById("view-host");
    var blurb = document.getElementById("view-blurb");
    gsel.innerHTML = cur.groups.map(function (g) { return '<option value="' + g.id + '">' + esc(g.name) + "</option>"; }).join("");
    gsel.addEventListener("change", function () {
      state.g = gsel.value; state.tabs = {}; state.date = ""; state.dateNote = "";
      render();
    });
    document.getElementById("view-switch").addEventListener("click", function (e) {
      var b = e.target.closest("[data-view]"); if (!b || !VIEWS[b.dataset.view]) return;
      state.view = b.dataset.view; render();
    });
    host.addEventListener("click", onClick);
    host.addEventListener("change", onChange);

    document.getElementById("related").innerHTML = "<ul>" +
      '<li><a href="library.html">Activity Library</a>: every game and drill, how to run it, and sources</li>' +
      '<li><a href="vocabulary.html">Vocabulary</a>: every term with kid versions and how to teach it</li>' +
      '<li><a href="playbook.html">Playbook</a>: research, game descriptions and sources by age group</li>' +
      P.related.filter(function (l) { return l.href.indexOf("cursor.com") < 0; }).map(function (l) {
        return '<li><a href="' + esc(l.href) + '" rel="noopener">' + esc(l.title) + "</a> <span class=\"muted small\">(" + esc(l.site) + ")</span></li>";
      }).join("") + "</ul>";

    function linkList(cell) {
      var parts = cell.split(", "), out = [], i = 0;
      while (i < parts.length) {
        var found = -1, j;
        for (j = parts.length; j > i; j--) {
          if (aIdx[H.nz(parts.slice(i, j).join(", "))]) { found = j; break; }
        }
        if (found < 0) { out.push(esc(parts[i])); i += 1; }
        else { out.push(la(parts.slice(i, found).join(", "))); i = found; }
      }
      return out.join(", ");
    }
    function G() { return cur.groups.filter(function (g) { return g.id === state.g; })[0]; }
    function monthWeeks(g, mi) { return g.weeks.filter(function (w) { return w.monthIndex === mi; }); }
    function weekAt(g) { return g.weeks[state.m * 4 + state.w]; }
    function nOf() { return state.m * 4 + state.w + 1; }
    function setWeekN(n) {
      n = Math.min(40, Math.max(1, n | 0));
      state.m = Math.floor((n - 1) / 4);
      state.w = (n - 1) % 4;
      state.road = state.m;
    }
    function phrase(g, name) {
      var x = cur.weekVocab[name] || ["", "", ""];
      return x[g.vocabLevel === "little" ? 2 : 1] || x[0] || "";
    }
    function chips(names, limit) {
      var list = names.slice(0, limit || names.length);
      var more = names.length - list.length;
      return list.map(function (n) {
        var e = vIdx[H.nz(n)];
        return e ? '<a class="chip" href="' + H.termHref(e) + '">' + esc(n) + "</a>" : '<span class="chip">' + esc(n) + "</span>";
      }).join("") + (more > 0 ? '<span class="chip">+' + more + "</span>" : "");
    }
    function uniq(arr) {
      var seen = {}, out = [];
      arr.forEach(function (n) { var k = H.nz(n); if (k && !seen[k]) { seen[k] = 1; out.push(n); } });
      return out;
    }
    function urlFor() {
      return "?group=" + state.g + "&view=" + state.view + "&month=" + state.m + "&week=" + (state.w + 1);
    }
    function sync(mode) {
      var next = urlFor();
      if (location.search === next) return;
      var data = { g: state.g, view: state.view, m: state.m, w: state.w };
      if (mode === "replace") history.replaceState(data, "", next);
      else history.pushState(data, "", next);
    }
    window.addEventListener("popstate", function () {
      var next = readParams(location.search);
      state.g = next.g; state.view = next.view; state.m = next.m; state.w = next.w;
      state.road = state.m; state.date = ""; state.dateNote = "";
      render("replace");
    });
    function goLesson(m, w) { state.m = m; state.w = w; state.view = "lesson"; state.road = m; render(); }

    function onClick(e) {
      var t = e.target.closest("[data-act]"); if (!t || !host.contains(t)) return;
      var act = t.dataset.act, m = +t.dataset.m, w = +t.dataset.w;
      if (act === "lesson") { goLesson(m, w); return; }
      if (act === "road") { state.road = state.road === m ? -1 : m; state.m = m; render(); return; }
      if (act === "tab") { state.m = m; state.w = w; state.tabs[m] = w; render(); return; }
      if (act === "step") { var n = nOf() + (+t.dataset.dir || 0); if (n < 1 || n > 40) return; setWeekN(n); state.date = ""; render(); return; }
      if (act === "print") { document.body.classList.add("print-week"); window.print(); return; }
      if (act === "cell") { state.m = m; state.w = w; render(); return; }
    }
    function onChange(e) {
      var t = e.target;
      if (t.id === "week-n") { setWeekN(+t.value); state.date = ""; render(); }
      if (t.id === "week-date") {
        state.date = t.value;
        if (!t.value) { state.dateNote = ""; render(); return; }
        var dt = new Date(t.value + "T12:00:00");
        var picked = weekInSeason(dt);
        if (!picked) {
          state.dateNote = "July and August sit outside this September–June plan.";
          render();
          return;
        }
        state.dateNote = "";
        state.m = picked.m;
        state.w = picked.w;
        state.road = state.m;
        render();
      }
      if (t.id === "month") { state.m = +t.value; state.w = 0; render(); }
    }
    window.addEventListener("afterprint", function () { document.body.classList.remove("print-week"); });

    function render(mode) {
      var g = G();
      gsel.value = g.id;
      var tw = document.getElementById("this-week");
      if (tw) tw.innerHTML = H.lessonCard(g);
      document.getElementById("group-intro").textContent = g.intro;
      blurb.textContent = VIEWS[state.view];
      document.querySelectorAll("#view-switch [data-view]").forEach(function (b) {
        var on = b.dataset.view === state.view;
        b.setAttribute("aria-pressed", on ? "true" : "false");
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      var html = state.view === "roadmap" ? roadmap(g)
        : state.view === "months" ? months(g)
        : state.view === "ladder" ? ladder(g)
        : state.view === "table" ? table(g)
        : lesson(g);
      host.innerHTML = html;
      var games = document.getElementById("games");
      if (games) games.innerHTML = H.table(["Month", "Weeks 1 and 3", "Weeks 2 and 4"], g.gamesByMonth.map(function (r) {
        if (r[1] === "Fun rotation") return [esc(r[0]), "Fun rotation", linkList(r[2])];
        return [esc(r[0]), la(r[1]), la(r[2])];
      }), { raw: true });
      var session = document.getElementById("session");
      if (session) {
        document.getElementById("session-min").textContent = g.minutes;
        session.innerHTML = '<ol class="steps">' + g.session.map(function (s) {
          return "<li><b>" + esc(s.title) + "</b>" + esc(s.detail) + "</li>";
        }).join("") + "</ol>";
      }
      var notes = document.getElementById("notes");
      if (notes) notes.innerHTML = "<ul>" + g.notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>";
      sync(mode || "push");
    }

    function lesson(g) {
      var m = g.months[state.m], r = weekAt(g), review = m.c === "fun";
      var blocks = g.blocks.map(function (b) {
        var name = { W: r.warm, D: r.drill, G: r.game, C: r.cool }[b.slot];
        return '<li class="block-row"><div class="mins">' + b.min + '<span>min</span></div><div><h3>' + esc(b.label) + "</h3>" +
          (name ? "<p>" + la(name) + "</p>" : "<p>Break</p>") +
          '<p class="cue">' + esc(FOCUS[b.slot](r)) + "</p></div></li>";
      }).join("");
      var vocab = r.vocab.map(function (name) {
        var say = phrase(g, name);
        return '<li class="block-row"><div class="mins"> </div><div><h3>' + lv(name) + "</h3>" +
          (say ? '<p class="cue">' + esc(say) + "</p>" : "") + "</div></li>";
      }).join("");
      return '<article class="lesson-sheet' + (review ? " review" : "") + '">' +
        '<p class="print-only"><strong>' + esc(H.SITE_TITLE) + "</strong></p>" +
        '<p class="lesson-kicker">' + esc(g.name) + " · " + g.minutes + " min · school-year week " + nOf() + " of 40" +
        (review ? " · Review & Play" : "") + "</p>" +
        "<h2>" + esc(m.m) + " · Week " + (state.w + 1) + "</h2>" +
        '<p class="lesson-skill">' + esc(r.skill) + "</p>" +
        '<p class="muted">' + esc(m.theme) + " · " + esc(r.type) + "</p>" +
        '<div class="lesson-tools no-print"><label class="field">School-year week<input id="week-n" type="number" min="1" max="40" value="' + nOf() + '"></label>' +
        '<label class="field">Or a date in the season<input id="week-date" type="date" value="' + esc(state.date) + '"></label>' +
        '<div class="lesson-nav"><button type="button" class="btn ghost" data-act="step" data-dir="-1">Previous</button>' +
        '<button type="button" class="btn ghost" data-act="step" data-dir="1">Next</button>' +
        '<button type="button" class="btn" data-act="print">Print this card</button></div></div>' +
        '<p class="muted small no-print" id="date-note">' + esc(state.dateNote || "A date uses the calendar month, then days 1–7, 8–14, 15–21, and 22 through the end as the four weeks.") + "</p>" +
        '<h3>The class</h3><ol class="block-list">' + blocks + "</ol>" +
        "<h3>Vocabulary</h3><ul class=\"block-list\">" + vocab + "</ul></article>";
    }

    function roadmap(g) {
      return '<ol class="roadmap">' + g.months.map(function (m, mi) {
        var weeks = monthWeeks(g, mi), review = m.c === "fun", open = state.road === mi;
        var focus = weeks.map(function (w) { return "Wk " + w.week + " " + w.skill; }).join(" · ");
        return '<li class="road-card' + (review ? " review" : "") + '"><div class="road-body">' +
          '<p class="road-k">' + esc(m.m) + (review ? " · Review & Play" : "") + "</p>" +
          "<h3>" + esc(m.theme) + "</h3>" +
          '<p class="road-focus">' + esc(focus) + "</p>" +
          '<button type="button" class="btn ghost road-open" data-act="road" data-m="' + mi + '">' + (open ? "Hide weeks" : "Show 4 weeks") + "</button>" +
          (open ? '<ul class="road-weeks">' + weeks.map(function (w) {
            return '<li><button type="button" data-act="lesson" data-m="' + mi + '" data-w="' + (w.week - 1) + '"><b>Week ' + w.week + " · " + esc(w.skill) + "</b><span class=\"muted\">" + esc(w.type) + "</span></button></li>";
          }).join("") + "</ul>" : "") +
          "</div></li>";
      }).join("") + "</ol>";
    }

    function months(g) {
      return '<div class="month-grid">' + g.months.map(function (m, mi) {
        var weeks = monthWeeks(g, mi), review = m.c === "fun";
        var tab = state.tabs[mi] != null ? state.tabs[mi] : (mi === state.m ? state.w : 0);
        tab = Math.min(weeks.length - 1, Math.max(0, tab));
        var shown = weeks[tab];
        var skills = weeks.slice(0, 3).map(function (w) { return "<li>" + esc(w.skill) + "</li>"; }).join("");
        var names = uniq([].concat.apply([], weeks.map(function (w) { return w.vocab; })));
        return '<article class="month-card' + (review ? " review" : "") + '">' +
          '<p class="road-k">' + esc(m.m) + (review ? " · Review & Play" : "") + "</p>" +
          "<h3>" + esc(m.theme) + "</h3>" +
          '<ul class="skills">' + skills + "</ul>" +
          '<div class="chips">' + chips(names, 6) + "</div>" +
          '<div class="mini-tabs" role="tablist" aria-label="' + esc(m.m) + ' weeks">' + weeks.map(function (w, i) {
            return '<button type="button" role="tab" aria-pressed="' + (i === tab ? "true" : "false") + '" data-act="tab" data-m="' + mi + '" data-w="' + i + '">Wk ' + w.week + "</button>";
          }).join("") + "</div>" +
          (shown ? '<div class="month-detail"><p><b>' + esc(shown.skill) + "</b> · " + esc(shown.type) + "</p>" +
            "<p>Warm-up " + la(shown.warm) + " · Drill " + la(shown.drill) + "</p>" +
            "<p>Game " + la(shown.game) + " · Cool-down " + la(shown.cool) + "</p>" +
            '<p><button type="button" class="btn ghost" data-act="lesson" data-m="' + mi + '" data-w="' + tab + '">Open this week\'s card</button></p></div>' : "") +
          "</article>";
      }).join("") + "</div>";
    }

    function ladder(g) {
      var order = ["rope", "tech", "str", "event", "fun"];
      return order.map(function (cat) {
        var label = (CAT[cat] && CAT[cat].label) || cat;
        var stops = g.months.map(function (m, mi) { return { m: m, mi: mi }; }).filter(function (x) { return x.m.c === cat; });
        if (!stops.length) return "";
        return '<section class="lane' + (cat === "fun" ? " review" : "") + '"><h3>' + esc(label) + '</h3><div class="lane-track">' +
          stops.map(function (x) {
            var weeks = monthWeeks(g, x.mi);
            return '<div class="lane-stop"><p class="road-k">' + esc(x.m.m) + "</p><b>" + esc(x.m.theme) + "</b><ol>" +
              weeks.map(function (w) {
                return '<li><button type="button" data-act="lesson" data-m="' + x.mi + '" data-w="' + (w.week - 1) + '"><span class="wk">Week ' + w.week + "</span>" + esc(w.skill) + "</button></li>";
              }).join("") + "</ol></div>";
          }).join("") + "</div></section>";
      }).join("");
    }

    function table(g) {
      var h = '<div class="table-tools no-print week-head"><label class="field" for="month" style="flex:1;min-width:220px">Month<select id="month">' +
        g.months.map(function (m, i) { return '<option value="' + i + '"' + (i === state.m ? " selected" : "") + ">" + esc(m.m + ": " + m.theme) + "</option>"; }).join("") +
        '</select></label><div class="seg" id="weeks" role="group" aria-label="Week">' +
        [0, 1, 2, 3].map(function (i) {
          return '<button type="button" data-act="cell" data-m="' + state.m + '" data-w="' + i + '" aria-pressed="' + (i === state.w) + '">Week ' + (i + 1) + "</button>";
        }).join("") + "</div></div>";
      h += '<div class="chart" role="grid" aria-label="School-year chart"><div class="h">Month</div><div class="h">Theme</div><div class="h">Skill Progression</div><div class="h">Weekly Structure</div>';
      var row = 2;
      g.months.forEach(function (m, mi) {
        var span = m.w.length, review = m.c === "fun", cls = "c" + (review ? " review" : "");
        var sel = mi === state.m ? " sel" : "";
        h += '<div class="' + cls + " m" + sel + '" style="grid-column:1;grid-row:' + row + " / span " + span + '" data-act="cell" data-m="' + mi + '" data-w="0">' + esc(m.m) + (review ? '<span class="review-tag">Review & Play</span>' : "") + "</div>";
        h += '<div class="' + cls + ' t" style="grid-column:2;grid-row:' + row + " / span " + span + '" data-act="cell" data-m="' + mi + '" data-w="0">' + esc(m.theme) + "</div>";
        m.w.forEach(function (w, i) {
          var attrs = ' data-act="cell" data-m="' + mi + '" data-w="' + i + '" style="grid-column:COL;grid-row:' + (row + i) + '"';
          h += '<div class="' + cls + '"' + attrs.replace("COL", "3") + ">" + esc(w[0]) + "</div>";
          h += '<div class="' + cls + '"' + attrs.replace("COL", "4") + ">" + esc(w[1] || g.types[i] || "") + "</div>";
        });
        row += span;
      });
      h += "</div>";
      var m = g.months[state.m], r = weekAt(g);
      var lvl = g.vocabLevel === "little" ? 2 : 1;
      var month = g.weeks.slice(state.m * 4, state.m * 4 + 4);
      var total = g.blocks.reduce(function (s, b) { return s + b.min; }, 0);
      h += '<div class="banner' + (m.c === "fun" ? " review" : "") + '" style="margin-top:16px"><div class="k">' + esc(m.m + " · Week " + (state.w + 1) + " · " + m.theme) + '</div><div class="s">' + esc(r.skill) + "</div></div>";
      h += "<h3>Vocabulary this week</h3>" + H.table(["Term", "What it means (for you)", lvl === 2 ? "Say it like this (ages 2–6)" : "Say it like this (kid or teen version)"],
        r.vocab.map(function (v) { var x = cur.weekVocab[v] || ["", "", ""]; return [lv(v), esc(x[0]), esc(x[lvl])]; }), { raw: true });
      h += "<h3>Activities (" + total + " min)</h3>" + H.table(["Block", "Minutes", "Activity (Library name)", "Focus"],
        g.blocks.map(function (b) {
          var name = { W: r.warm, D: r.drill, G: r.game, C: r.cool }[b.slot];
          return [esc(b.label), String(b.min), name ? la(name) : esc(b.label), esc((FOCUS[b.slot] || FOCUS.W)(r))];
        }), { raw: true, num: [1] });
      h += "<h3>This month at a glance</h3>" + H.table(["Week", "Skill", "Skill drill", "Game", "Vocabulary"],
        month.map(function (x) { return [String(x.week), esc(x.skill), la(x.drill), la(x.game), x.vocab.map(lv).join(", ")]; }), { raw: true });
      return h;
    }

      render("replace");
  }).catch(H.fail);
})();
