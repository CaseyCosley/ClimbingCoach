(function () {
  "use strict";
  var H = window.Hub, esc = H.esc, nz = H.nz;
  H.init("vocabulary.html");
  H.load("vocabulary").then(function (d) {
    var V = d.items.slice().sort(function (x, y) { return x.name.localeCompare(y.name); });
    var cats = Array.from(new Set(d.items.map(function (v) { return v.category; })));
    var el = function (id) { return document.getElementById(id); };
    el("f-cat").innerHTML = '<option value="all">All categories</option>' + cats.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("");
    var q = new URLSearchParams(location.search);
    if (q.get("q")) el("q").value = q.get("q");
    if (q.get("category") && cats.indexOf(q.get("category")) >= 0) el("f-cat").value = q.get("category");
    el("q").addEventListener("input", run); el("f-cat").addEventListener("change", run);
    function run() {
      var qq = nz(el("q").value), c = el("f-cat").value;
      var res = V.filter(function (v) { return (c === "all" || v.category === c) && (!qq || [v.name].concat(v.aka, [v.definition, v.kid, v.little]).map(nz).join("|").indexOf(qq) >= 0); });
      var p = new URLSearchParams(); if (el("q").value) p.set("q", el("q").value); if (c !== "all") p.set("category", c);
      history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : ""));
      el("count").textContent = res.length + " of " + V.length + " terms";
      el("results").innerHTML = res.map(function (v) {
        return '<a class="item" href="' + H.termHref(v) + '"><h3>' + esc(v.name) + '</h3><div class="meta">' + esc(v.category) +
          (v.aka.length ? " | Also called: " + esc(v.aka.join(", ")) : "") + "</div><div>" + esc(v.definition) + "</div></a>";
      }).join("") || '<p class="muted">No matches.</p>';
    }
    run();
  }).catch(H.fail);
})();
