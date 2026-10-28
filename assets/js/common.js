/* Youth Climbing Coaching Hub: shared helpers (no dependencies) */
(function () {
  "use strict";
  var SITE_TITLE = "Youth Climbing Coaching Hub";
  var NAV = [
    ["index.html", "Home"],
    ["curricula.html", "Curricula"],
    ["library.html", "Activity Library"],
    ["vocabulary.html", "Vocabulary"],
    ["playbook.html", "Playbook"],
    ["about.html", "How it works"]
  ];
  var cache = {};

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function nz(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

  function load(name) {
    if (!cache[name]) {
      cache[name] = fetch("data/" + name + ".json", { cache: "no-cache" }).then(function (r) {
        if (!r.ok) throw new Error("Could not load data/" + name + ".json (" + r.status + ")");
        return r.json();
      });
    }
    return cache[name];
  }
  function loadAll(names) {
    return Promise.all(names.map(load)).then(function (arr) {
      var o = {}; names.forEach(function (n, i) { o[n] = arr[i]; }); return o;
    });
  }

  /* name/alias -> entry lookups (normalized, so punctuation variants resolve) */
  function indexByName(items) {
    var m = {};
    items.forEach(function (it) {
      [it.name].concat(it.aka || []).forEach(function (n) { var k = nz(n); if (k && !m[k]) m[k] = it; });
    });
    return m;
  }
  function actHref(a) { return "activity.html#" + encodeURIComponent(a.id); }
  function termHref(v) { return "term.html#" + encodeURIComponent(v.id); }
  function linkName(name, idx, hrefFn) {
    var e = idx[nz(name)];
    return e ? '<a href="' + hrefFn(e) + '">' + esc(name) + "</a>" : esc(name);
  }

  /* where each activity / term is used across the 280 weekly plans */
  function usageIndex(cur) {
    var acts = {}, terms = {};
    cur.groups.forEach(function (g) {
      g.weeks.forEach(function (w) {
        var ref = { g: g, w: w };
        [w.warm, w.drill, w.game, w.cool].forEach(function (n) { var k = nz(n); (acts[k] = acts[k] || []).push(ref); });
        w.vocab.forEach(function (n) { var k = nz(n); (terms[k] = terms[k] || []).push(ref); });
      });
    });
    return { acts: acts, terms: terms };
  }
  /* September = month index 0. July and August fall back to week 1. */
  var SEASON = { 8: 0, 9: 1, 10: 2, 11: 3, 0: 4, 1: 5, 2: 6, 3: 7, 4: 8, 5: 9 };
  function seasonWeek(dt) {
    dt = dt || new Date();
    if (!(dt.getMonth() in SEASON)) return { m: 0, w: 0, outside: true };
    var day = dt.getDate();
    return { m: SEASON[dt.getMonth()], w: day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3, outside: false };
  }
  function lessonHref(gid, monthIndex, week) {
    if (monthIndex == null || week == null) {
      var s = seasonWeek();
      monthIndex = s.m;
      week = s.w + 1;
    }
    return "curricula.html?group=" + gid + "&view=lesson&month=" + monthIndex + "&week=" + week;
  }
  function weekHref(gid, monthIndex, week) {
    return lessonHref(gid, monthIndex, week);
  }
  function lessonCard(group) {
    var s = seasonWeek();
    var month = group.months[s.m];
    var plan = group.weeks[s.m * 4 + s.w];
    if (!month || !plan) return "";
    return '<a class="this-week" href="' + lessonHref(group.id) + '">' +
      '<span class="kicker">This week\'s lesson</span>' +
      "<strong>" + esc(plan.skill) + "</strong>" +
      '<span class="muted">' + esc(group.name) + " · " + esc(month.m) + " · Week " + (s.w + 1) + " · " + esc(month.theme) + "</span>" +
      '<span class="more">Open the full card</span></a>';
  }

  /* "[5][2]" citations -> links to the numbered source list */
  function cite(text, prefix) {
    return esc(text).replace(/\[(\d+)\]/g, function (_, n) {
      return '<a class="cite" href="' + (prefix || "#src-") + n + '" aria-label="Source ' + n + '">[' + n + "]</a>";
    });
  }

  function table(columns, rows, opts) {
    opts = opts || {};
    var h = '<div class="table-wrap"><table><thead><tr>' + columns.map(function (c) { return "<th scope=\"col\">" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>";
    rows.forEach(function (r) {
      h += "<tr>" + r.map(function (cell, i) {
        var cls = opts.num && opts.num.indexOf(i) >= 0 ? ' class="num"' : "";
        return "<td" + cls + ' data-label="' + esc(columns[i]) + '">' + (opts.raw ? cell : esc(cell)) + "</td>";
      }).join("") + "</tr>";
    });
    return h + "</tbody></table></div>";
  }

  function header(active) {
    var el = document.getElementById("site-header");
    if (!el) return;
    el.className = "site-header";
    el.innerHTML = '<a class="skip" href="#main">Skip to content</a><div class="bar">' +
      '<a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true"></span><span class="brand-full">' + SITE_TITLE + '</span><span class="brand-short">Coaching Hub</span></a>' +
      '<button class="nav-toggle" aria-expanded="false" aria-controls="site-nav">Menu</button>' +
      '<nav class="nav" id="site-nav" aria-label="Main">' + NAV.map(function (n) {
        return '<a href="' + n[0] + '"' + (n[0] === active ? ' aria-current="page"' : "") + ">" + n[1] + "</a>";
      }).join("") + "</nav></div>";
    el.querySelector(".skip").addEventListener("click", function (e) {
      e.preventDefault(); var m = document.getElementById("main"); if (m) m.focus();
    });
    var btn = el.querySelector(".nav-toggle"), nav = el.querySelector(".nav");
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open"); btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  function footer() {
    var el = document.getElementById("site-footer");
    if (!el) return;
    el.className = "site-footer";
    el.innerHTML = '<div class="bar"><span>' + SITE_TITLE + '</span><span id="footer-stats">Loading counts…</span></div>';
    loadAll(["activities", "vocabulary", "curricula"]).then(function (d) {
      var weeks = d.curricula.groups.reduce(function (s, g) { return s + g.weeks.length; }, 0);
      document.getElementById("footer-stats").innerHTML =
        "Last updated " + esc(d.activities.lastUpdated) + " · " + d.activities.items.length + " activities · " +
        d.vocabulary.items.length + " vocabulary terms · " + weeks + " weekly plans";
    }).catch(function () { document.getElementById("footer-stats").textContent = ""; });
  }

  function fail(err) {
    var m = document.getElementById("main");
    var msg = location.protocol === "file:"
      ? "This site loads its content from the data folder, which browsers block when a page is opened straight from disk. Run a static server in this folder (for example: python3 -m http.server) and open http://localhost:8000."
      : "Could not load the site data: " + (err && err.message);
    if (m) m.insertAdjacentHTML("afterbegin", '<p class="error" role="alert">' + esc(msg) + "</p>");
    if (window.console) console.warn(err);
  }

  function init(active) { header(active); footer(); }

  window.Hub = {
    SITE_TITLE: SITE_TITLE, esc: esc, nz: nz, load: load, loadAll: loadAll, indexByName: indexByName,
    actHref: actHref, termHref: termHref, linkName: linkName, usageIndex: usageIndex, weekHref: weekHref,
    seasonWeek: seasonWeek, lessonHref: lessonHref, lessonCard: lessonCard,
    cite: cite, table: table, init: init, fail: fail
  };
})();
