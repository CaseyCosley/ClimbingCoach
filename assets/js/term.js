(function () {
  "use strict";
  var H = window.Hub, esc = H.esc;
  H.init("vocabulary.html");
  H.loadAll(["vocabulary", "curricula"]).then(function (d) {
    var V = d.vocabulary.items.slice().sort(function (x, y) { return x.name.localeCompare(y.name); });
    var U = H.usageIndex(d.curricula);
    function show() {
      var id = decodeURIComponent(location.hash.slice(1));
      var i = V.findIndex(function (v) { return v.id === id; });
      var main = document.getElementById("detail");
      if (i < 0) { document.title = "Term not found · " + H.SITE_TITLE; main.innerHTML = '<h1>Term not found</h1><p>No term has the id “' + esc(id) + '”. <a href="vocabulary.html">Browse the Vocabulary</a>.</p>'; return; }
      var v = V[i];
      document.title = v.name + " · Vocabulary · " + H.SITE_TITLE;
      var uses = U.terms[H.nz(v.name)] || [], byGroup = {};
      uses.forEach(function (u) { (byGroup[u.g.id] = byGroup[u.g.id] || { g: u.g, w: [] }).w.push(u.w); });
      var useHtml = uses.length ? "<ul>" + Object.keys(byGroup).map(function (k) {
        var b = byGroup[k];
        return "<li><b>" + esc(b.g.name) + ":</b> " + b.w.map(function (w) { return '<a href="' + H.weekHref(b.g.id, w.monthIndex, w.week) + '">' + esc(w.month + " wk " + w.week) + "</a>"; }).join(", ") + "</li>";
      }).join("") + "</ul>" : '<p class="muted">Not a weekly focus term yet.</p>';
      var prev = V[(i - 1 + V.length) % V.length], next = V[(i + 1) % V.length];
      main.innerHTML = '<nav class="crumbs no-print"><a href="vocabulary.html">Vocabulary</a> › ' + esc(v.name) + "</nav>" +
        '<article class="card"><h1>' + esc(v.name) + "</h1>" +
        '<p><a class="pill" href="vocabulary.html?category=' + encodeURIComponent(v.category) + '">' + esc(v.category) + "</a></p>" +
        (v.aka.length ? '<p class="muted">Also called: ' + esc(v.aka.join(", ")) + "</p>" : "") +
        "<dl><dt>Plain definition (ages 12+ and 14+, coaches)</dt><dd>" + esc(v.definition) + "</dd>" +
        "<dt>Kid version (ages 6–9 and 9–12)</dt><dd>" + esc(v.kid) + "</dd>" +
        "<dt>Little-kid version (Parent &amp; Child, ages 3–4 and 4–6)</dt><dd>" + esc(v.little) + "</dd>" +
        "<dt>How to teach or demo it</dt><dd>" + esc(v.demo) + "</dd>" +
        "<dt>Weeks where it is a focus term (" + uses.length + ")</dt><dd>" + useHtml + "</dd></dl></article>" +
        '<div class="pager no-print"><a class="btn ghost" href="' + H.termHref(prev) + '">← ' + esc(prev.name) + '</a><a class="btn ghost" href="' + H.termHref(next) + '">' + esc(next.name) + " →</a></div>";
      window.scrollTo(0, 0);
    }
    window.addEventListener("hashchange", show);
    show();
  }).catch(H.fail);
})();
