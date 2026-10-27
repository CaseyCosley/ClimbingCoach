(function () {
  "use strict";
  var H = window.Hub, esc = H.esc;
  H.init("library.html");
  H.loadAll(["activities", "meta", "sources", "curricula", "vocabulary"]).then(function (d) {
    var A = d.activities.items.slice().sort(function (x, y) { return x.name.localeCompare(y.name); });
    var M = d.meta, S = d.sources, U = H.usageIndex(d.curricula);
    var ageLabel = {}; M.ages.forEach(function (a) { ageLabel[a.id] = a.label; });
    var typeLabel = {}; M.types.forEach(function (t) { typeLabel[t.id] = t.label; });
    var themeLabel = {}; M.themes.forEach(function (t) { themeLabel[t.id] = t.label; });
    var vIdx = H.indexByName(d.vocabulary.items);
    function show() {
      var id = decodeURIComponent(location.hash.slice(1));
      var i = A.findIndex(function (a) { return a.id === id; });
      var main = document.getElementById("detail");
      if (i < 0) {
        document.title = "Activity not found · " + H.SITE_TITLE;
        main.innerHTML = '<h1>Activity not found</h1><p>No activity has the id “' + esc(id) + '”. <a href="library.html">Browse the Activity Library</a>.</p>';
        return;
      }
      var a = A[i];
      document.title = a.name + " · Activity Library · " + H.SITE_TITLE;
      var src = a.sources.map(function (k) {
        var s = S.library[k];
        return s ? '<li><a href="' + esc(s.href) + '" rel="noopener">' + esc(s.site + ": " + s.title) + "</a></li>" : "<li>" + esc(S.coachingPractice) + "</li>";
      }).join("");
      var uses = U.acts[H.nz(a.name)] || [];
      var byGroup = {};
      uses.forEach(function (u) { (byGroup[u.g.id] = byGroup[u.g.id] || { g: u.g, w: [] }).w.push(u.w); });
      var useHtml = Object.keys(byGroup).length ? "<ul>" + Object.keys(byGroup).map(function (k) {
        var b = byGroup[k];
        return "<li><b>" + esc(b.g.name) + ":</b> " + b.w.map(function (w) {
          return '<a href="' + H.weekHref(b.g.id, w.monthIndex, w.week) + '">' + esc(w.month + " wk " + w.week) + "</a>"; }).join(", ") + "</li>";
      }).join("") + "</ul>" : '<p class="muted">Not scheduled in the weekly plans yet; use it as a swap-in.</p>';
      var prev = A[(i - 1 + A.length) % A.length], next = A[(i + 1) % A.length];
      main.innerHTML = '<nav class="crumbs no-print"><a href="library.html">Activity Library</a> › ' + esc(a.name) + "</nav>" +
        '<article class="card th-' + esc(a.themes[0]) + '" style="border-left-width:6px">' +
        "<h1>" + esc(a.name) + "</h1>" +
        (a.aka.length ? '<p class="muted">Also called: ' + esc(a.aka.join(", ")) + "</p>" : "") +
        "<div>" + a.types.map(function (t) { return '<a class="pill" href="library.html?type=' + esc(t) + '">' + esc(typeLabel[t] || t) + "</a>"; }).join("") +
        a.skills.map(function (s) { return '<a class="pill" href="library.html?skill=' + encodeURIComponent(s) + '">' + esc(s) + "</a>"; }).join("") + "</div>" +
        "<dl><dt>Ages</dt><dd>" + a.ages.map(function (x) { return '<a class="pill" href="library.html?age=' + x + '">' + esc(ageLabel[x] || x) + "</a>"; }).join("") + "</dd>" +
        "<dt>Month themes</dt><dd>" + a.themes.map(function (t) { return '<span class="pill"><span class="swatch bg-' + esc(t) + '"></span>' + esc(themeLabel[t] || t) + "</span>"; }).join("") + "</dd>" +
        "<dt>Setup</dt><dd>" + esc(a.setup) + "</dd>" +
        "<dt>How to run it</dt><dd><ol>" + a.steps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol></dd>" +
        "<dt>Why it works</dt><dd>" + esc(a.why) + "</dd>" +
        "<dt>Variations and progressions by age</dt><dd>" + esc(a.variations) + "</dd>" +
        "<dt>Risk management</dt><dd>" + esc(a.risk) + "</dd>" +
        '<dt>Source</dt><dd><ul class="sources">' + src + "</ul></dd>" +
        "<dt>Where it appears in the weekly plans (" + uses.length + ")</dt><dd>" + useHtml + "</dd></dl></article>" +
        '<div class="pager no-print"><a class="btn ghost" href="' + H.actHref(prev) + '">← ' + esc(prev.name) + '</a><a class="btn ghost" href="' + H.actHref(next) + '">' + esc(next.name) + " →</a></div>";
      void vIdx;
      window.scrollTo(0, 0);
    }
    window.addEventListener("hashchange", show);
    show();
  }).catch(H.fail);
})();
