(function () {
  "use strict";
  var H = window.Hub, esc = H.esc, cite = H.cite;
  H.init("playbook.html");
  H.loadAll(["playbook", "activities"]).then(function (d) {
    var P = d.playbook, aIdx = H.indexByName(d.activities.items);
    var ul = function (items) {
      return "<ul>" + items.map(function (x) {
        return typeof x === "string" ? "<li>" + cite(x) + "</li>" : "<li><b>" + cite(x.text) + "</b>" + ul(x.items) + "</li>";
      }).join("") + "</ul>";
    };
    var lib = function (name) { var a = aIdx[H.nz(name)]; return a ? '<a href="' + H.actHref(a) + '">' + esc(name) + "</a>" : esc(name); };
    var toc = [["principles", P.principles.heading], ["game-theory", P.gameTheory.heading], ["comparison", "Comparison across age groups"]]
      .concat(P.groups.map(function (g) { return [g.id, g.name]; })).concat([["gaps", P.gaps.heading], ["sources", "Sources"]]);
    var h = '<h1>Youth Climbing Coaching Playbook by Age Group</h1><p class="lead">' + esc(P.summary) + "</p>" +
      '<nav class="card no-print" aria-label="On this page"><b>On this page</b><ol class="toc">' + toc.map(function (t) { return '<li><a href="#' + t[0] + '">' + esc(t[1]) + "</a></li>"; }).join("") + "</ol></nav>";
    h += '<section id="principles"><h2>' + esc(P.principles.heading) + '</h2><div class="callout"><strong>' + esc(P.principles.callout.lead) + "</strong>" + esc(P.principles.callout.text) + "</div>" + ul(P.principles.bullets) + "<p>" + cite(P.principles.text) + "</p></section>";
    h += '<section id="game-theory"><h2>' + esc(P.gameTheory.heading) + "</h2><p>" + cite(P.gameTheory.intro) + "</p>" + ul(P.gameTheory.bullets) + "</section>";
    h += '<section id="comparison"><h2>Comparison across age groups</h2>' + H.table(P.comparison.columns, P.comparison.rows) + "</section>";
    P.groups.forEach(function (g) {
      h += '<section class="group" id="' + esc(g.id) + '"><h2>' + esc(g.name) + '</h2><dl class="props">' + g.props.map(function (p) { return "<dt>" + esc(p.label) + "</dt><dd>" + cite(p.value) + "</dd>"; }).join("") + "</dl>" +
        "<h3>How they learn</h3>" + ul(g.learn) + "<h3>What motivates them</h3>" + ul(g.motivate) +
        "<h3>Game-based approach that fits</h3><p>" + cite(g.approach) + "</p>" +
        "<h3>Games and drills</h3>" + H.table(["Game", "How it works"], g.games.map(function (r) { return [lib(r[0]), cite(r[1])]; }), { raw: true }) +
        '<h3>Coaching tips and pitfalls</h3><div class="proscons"><div class="card"><h4>Do</h4>' + ul(g.dos) + '</div><div class="card"><h4>Avoid</h4>' + ul(g.donts) + "</div></div></section>";
    });
    h += '<section id="gaps"><h2>' + esc(P.gaps.heading) + '</h2><div class="callout"><strong>' + esc(P.gaps.callout.lead) + "</strong>" + esc(P.gaps.callout.text) + "</div>" + ul(P.gaps.bullets) + "</section>";
    document.getElementById("playbook").innerHTML = h;
    H.load("sources").then(function (s) {
      document.getElementById("playbook").insertAdjacentHTML("beforeend", '<section id="sources"><h2>Sources</h2><ol class="sources">' + s.playbook.map(function (x, i) {
        return '<li id="src-' + (i + 1) + '"><a href="' + esc(x.href) + '" rel="noopener">' + esc(x.title) + '</a> <span class="muted small">(' + esc(x.site) + ")</span></li>"; }).join("") + "</ol></section>");
      if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
    });
  }).catch(H.fail);
})();
