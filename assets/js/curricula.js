(function () {
  "use strict";
  var H = window.Hub, esc = H.esc;
  H.init("curricula.html");
  var FOCUS = {
    W: function () { return "Raise heart rate and loosen joints before climbing"; },
    D: function (r) { return "Teach: " + r.skill; },
    G: function () { return "Reward this week's skill, not just reaching the top"; },
    C: function () { return "Recover, then each climber names one thing they got better at"; },
    B: function () { return "Drink, rest fingers, quick show-me of the skill"; }
  };
  H.loadAll(["curricula", "activities", "vocabulary", "pages"]).then(function (d) {
    var cur = d.curricula, P = d.pages.curricula, CAT = cur.categories;
    var aIdx = H.indexByName(d.activities.items), vIdx = H.indexByName(d.vocabulary.items);
    var la = function (n) { return H.linkName(n, aIdx, H.actHref); };
    var lv = function (n) { return H.linkName(n, vIdx, H.termHref); };
    var q = new URLSearchParams(location.search);
    var state = {
      g: cur.groups.some(function (g) { return g.id === q.get("group"); }) ? q.get("group") : cur.groups[0].id,
      m: Math.min(9, Math.max(0, parseInt(q.get("month"), 10) || 0)),
      w: Math.min(3, Math.max(0, (parseInt(q.get("week"), 10) || 1) - 1))
    };

    /* static intro */
    document.getElementById("intro").innerHTML = '<p class="lead">' + esc(P.summary) + "</p>";
    document.getElementById("how").innerHTML = "<ul>" + P.how.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" +
      '<div class="callout"><strong>' + esc(P.callout.lead) + "</strong>" + esc(P.callout.text) + "</div>" +
      '<ul class="theme-key">' + Object.keys(CAT).map(function (k) {
        return '<li' + (k === "fun" ? ' class="review-key"' : "") + ">" + esc(CAT[k].label) + "</li>";
      }).join("") + "</ul>";

    var gsel = document.getElementById("group");
    gsel.innerHTML = cur.groups.map(function (g) { return '<option value="' + g.id + '">' + esc(g.name) + "</option>"; }).join("");
    gsel.addEventListener("change", function () { state.g = gsel.value; state.m = 0; state.w = 0; render(true); });
    var msel = document.getElementById("month");
    msel.addEventListener("change", function () { state.m = +msel.value; renderWeek(); });
    document.getElementById("print-week").addEventListener("click", function () {
      document.body.classList.add("print-week"); window.print();
    });
    window.addEventListener("afterprint", function () { document.body.classList.remove("print-week"); });

    function G() { return cur.groups.filter(function (g) { return g.id === state.g; })[0]; }
    function sync() {
      var u = "?group=" + state.g + "&month=" + state.m + "&week=" + (state.w + 1) + location.hash;
      history.replaceState(null, "", u);
    }

    function chart(g) {
      var h = '<div class="h">Month</div><div class="h">Theme</div><div class="h">Skill Progression</div><div class="h">Weekly Structure</div>';
      var row = 2;
      g.months.forEach(function (m, mi) {
        var span = m.w.length, review = m.c === "fun", cls = "c" + (review ? " review" : "");
        var sel = mi === state.m ? " sel" : "";
        h += '<div class="' + cls + ' m' + sel + '" style="grid-column:1;grid-row:' + row + " / span " + span + '" data-m="' + mi + '" data-w="0" title="Open ' + esc(m.m) + ' week plans">' + esc(m.m) + (review ? '<span class="review-tag">Review & Play</span>' : "") + "</div>";
        h += '<div class="' + cls + ' t" style="grid-column:2;grid-row:' + row + " / span " + span + '" data-m="' + mi + '" data-w="0">' + esc(m.theme) + "</div>";
        m.w.forEach(function (w, i) {
          var attrs = ' data-m="' + mi + '" data-w="' + i + '" style="grid-column:COL;grid-row:' + (row + i) + '"';
          h += '<div class="' + cls + '"' + attrs.replace("COL", "3") + ">" + esc(w[0]) + "</div>";
          h += '<div class="' + cls + '"' + attrs.replace("COL", "4") + ">" + esc(w[1] || g.types[i]) + "</div>";
        });
        row += span;
      });
      return h;
    }

    function render(scroll) {
      var g = G();
      gsel.value = g.id;
      document.querySelectorAll("[data-gname]").forEach(function (el) { el.textContent = g.name; });
      document.getElementById("group-intro").textContent = g.intro;
      var ch = document.getElementById("chart");
      ch.innerHTML = chart(g);
      ch.onclick = function (e) {
        var c = e.target.closest("[data-m]"); if (!c) return;
        state.m = +c.dataset.m; state.w = +c.dataset.w; renderWeek();
        document.getElementById("week-section").scrollIntoView({ behavior: "smooth", block: "start" });
      };
      msel.innerHTML = g.months.map(function (m, i) { return '<option value="' + i + '">' + esc(m.m + ": " + m.theme) + "</option>"; }).join("");
      document.getElementById("session-min").textContent = g.minutes;
      document.getElementById("session").innerHTML = '<ol class="steps">' + g.session.map(function (s) {
        return "<li><b>" + esc(s.title) + "</b>" + esc(s.detail) + "</li>"; }).join("") + "</ol>";
      document.getElementById("games").innerHTML = H.table(["Month", "Weeks 1 and 3", "Weeks 2 and 4"], g.gamesByMonth.map(function (r) {
        if (r[1] === "Fun rotation") return [esc(r[0]), "Fun rotation", r[2].split(", ").map(la).join(", ")];
        return [esc(r[0]), la(r[1]), la(r[2])];
      }), { raw: true });
      document.getElementById("notes").innerHTML = "<ul>" + g.notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>";
      renderWeek();
    }

    function renderWeek() {
      var g = G(), m = g.months[state.m];
      msel.value = String(state.m);
      var seg = document.getElementById("weeks");
      seg.innerHTML = [0, 1, 2, 3].map(function (i) { return '<button type="button" aria-pressed="' + (i === state.w) + '" data-w="' + i + '">Week ' + (i + 1) + "</button>"; }).join("");
      seg.onclick = function (e) { var b = e.target.closest("button"); if (b) { state.w = +b.dataset.w; renderWeek(); } };
      document.querySelectorAll("#chart .c").forEach(function (c) { c.classList.toggle("sel", +c.dataset.m === state.m && c.classList.contains("m")); });
      var r = g.weeks[state.m * 4 + state.w];
      var lvl = g.vocabLevel === "little" ? 2 : 1;
      var month = g.weeks.slice(state.m * 4, state.m * 4 + 4);
      var total = g.blocks.reduce(function (s, b) { return s + b.min; }, 0);
      var act = function (b) { return { W: r.warm, D: r.drill, G: r.game, C: r.cool }[b.slot]; };
      var h = '<div class="print-only"><strong>' + esc(H.SITE_TITLE) + "</strong> · " + esc(g.name) + " · " + g.minutes + " min class</div>";
      h += '<div class="banner' + (m.c === "fun" ? " review" : "") + '"><div class="k">' + esc(m.m + " · Week " + (state.w + 1) + " · " + m.theme + " · school-year week " + r.n + " of 40") + '</div><div class="s">' + esc(r.skill) + '</div><div class="k">Session type: ' + esc(r.type) + "</div></div>";
      h += "<h3>Vocabulary this week</h3>" + H.table(["Term", "What it means (for you)", lvl === 2 ? "Say it like this (ages 2–6)" : "Say it like this (kid or teen version)"],
        r.vocab.map(function (v) { var x = cur.weekVocab[v] || ["", "", ""]; return [lv(v), esc(x[0]), esc(x[lvl])]; }), { raw: true });
      h += "<h3>Activities (" + total + " min)</h3>" + H.table(["Block", "Minutes", "Activity (Library name)", "Focus"],
        g.blocks.map(function (b) { var a = act(b); return [esc(b.label), String(b.min), a ? la(a) : "Water break", esc(FOCUS[b.slot](r))]; }), { raw: true, num: [1] });
      h += "<h3>This month at a glance</h3>" + H.table(["Week", "Skill", "Skill drill", "Game", "Vocabulary"],
        month.map(function (x) { return [String(x.week), esc(x.skill), la(x.drill), la(x.game), x.vocab.map(lv).join(", ")]; }), { raw: true });
      document.getElementById("week-plan").innerHTML = h;
      sync();
    }

    document.getElementById("related").innerHTML = "<ul>" +
      '<li><a href="library.html">Activity Library</a>: every game and drill, how to run it, and sources</li>' +
      '<li><a href="vocabulary.html">Vocabulary</a>: every term with kid versions and how to teach it</li>' +
      '<li><a href="playbook.html">Playbook</a>: research, game descriptions and sources by age group</li>' +
      P.related.filter(function (l) { return l.href.indexOf("cursor.com") < 0; }).map(function (l) {
        return '<li><a href="' + esc(l.href) + '" rel="noopener">' + esc(l.title) + "</a> <span class=\"muted small\">(" + esc(l.site) + ")</span></li>";
      }).join("") + "</ul>";
    document.getElementById("week-intro").textContent = P.weekIntro;
    render();
    if (location.hash === "#week-section") setTimeout(function () { document.getElementById("week-section").scrollIntoView(); }, 50);
  }).catch(H.fail);
})();
