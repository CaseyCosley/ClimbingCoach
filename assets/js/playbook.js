(function () {
  "use strict";
  var H = window.Hub, esc = H.esc, cite = H.cite;
  H.init("playbook.html");
  H.loadAll(["playbook", "activities", "curricula"]).then(function (d) {
    var P = d.playbook, aIdx = H.indexByName(d.activities.items);
    var ul = function (items) {
      return "<ul>" + items.map(function (x) {
        return typeof x === "string" ? "<li>" + cite(x) + "</li>" : "<li><b>" + cite(x.text) + "</b>" + ul(x.items) + "</li>";
      }).join("") + "</ul>";
    };
    var lib = function (name) { var a = aIdx[H.nz(name)]; return a ? '<a href="' + H.actHref(a) + '">' + esc(name) + "</a>" : esc(name); };
    var byGroup = {};
    d.curricula.groups.forEach(function (g) { byGroup[g.id] = g; });
    var ids = P.groups.map(function (g) { return g.id; });
    var q = new URLSearchParams(location.search);
    var hash = location.hash.replace("#", "");
    var srcHash = hash.indexOf("src-") === 0 ? hash : "";
    var current = ids.indexOf(q.get("group")) >= 0 ? q.get("group") : (ids.indexOf(hash) >= 0 ? hash : ids[0]);

    var root = document.getElementById("playbook");
    root.innerHTML = '<div class="page-head"><h1>Playbook</h1><a class="how-link" href="about.html#playbook">How this works</a></div>' +
      '<section class="card no-print tool-bar" id="picker"><label class="field" for="pb-group">Age group<select id="pb-group">' +
      P.groups.map(function (g) { return '<option value="' + esc(g.id) + '">' + esc(g.name) + "</option>"; }).join("") +
      '</select></label><div id="this-week"></div></section><div id="pb-host"></div>' +
      '<details class="card" id="comparison"><summary><h2 style="display:inline;font-size:1.05rem">Compare age groups</h2></summary>' +
      H.table(P.comparison.columns, P.comparison.rows) + "</details>";

    var select = document.getElementById("pb-group");
    function show(id, push) {
      if (ids.indexOf(id) < 0) id = ids[0];
      current = id;
      select.value = id;
      var g = P.groups.filter(function (x) { return x.id === id; })[0];
      document.getElementById("this-week").innerHTML = byGroup[id] ? H.lessonCard(byGroup[id]) : "";
      document.getElementById("pb-host").innerHTML = '<section class="group" id="' + esc(g.id) + '"><h2>' + esc(g.name) + '</h2><dl class="props">' +
        g.props.map(function (p) { return "<dt>" + esc(p.label) + "</dt><dd>" + cite(p.value) + "</dd>"; }).join("") + "</dl>" +
        "<h3>How they learn</h3>" + ul(g.learn) + "<h3>What motivates them</h3>" + ul(g.motivate) +
        "<h3>Game-based approach that fits</h3><p>" + cite(g.approach) + "</p>" +
        "<h3>Games and drills</h3>" + H.table(["Game", "How it works"], g.games.map(function (r) { return [lib(r[0]), cite(r[1])]; }), { raw: true }) +
        '<h3>Coaching tips and pitfalls</h3><div class="proscons"><div class="card"><h4>Do</h4>' + ul(g.dos) + '</div><div class="card"><h4>Avoid</h4>' + ul(g.donts) + "</div></div></section>";
      var next = "?group=" + id;
      if (push && location.search !== next) history.pushState({ group: id }, "", next);
      else if (!push && location.search !== next) history.replaceState({ group: id }, "", next);
    }
    select.addEventListener("change", function () { show(select.value, true); });
    window.addEventListener("popstate", function () {
      var params = new URLSearchParams(location.search);
      show(params.get("group"), false);
    });
    show(current, false);

    H.load("sources").then(function (s) {
      root.insertAdjacentHTML("beforeend", '<section id="sources"><h2>Sources</h2><ol class="sources">' + s.playbook.map(function (x, i) {
        return '<li id="src-' + (i + 1) + '"><a href="' + esc(x.href) + '" rel="noopener">' + esc(x.title) + '</a> <span class="muted small">(' + esc(x.site) + ")</span></li>";
      }).join("") + "</ol></section>");
      if (srcHash) {
        var t = document.getElementById(srcHash);
        if (t) t.scrollIntoView();
      }
    });
  }).catch(H.fail);
})();
