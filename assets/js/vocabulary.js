(function () {
  "use strict";
  var H = window.Hub, esc = H.esc, nz = H.nz;
  H.init("vocabulary.html");
  H.load("vocabulary").then(function (d) {
    var V = d.items.slice().sort(function (x, y) { return x.name.localeCompare(y.name); });
    var cats = Array.from(new Set(d.items.map(function (v) { return v.category; }))).sort();
    var el = function (id) { return document.getElementById(id); };
    el("f-cat").innerHTML = '<option value="all">All categories</option>' + cats.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("");
    var discs = [["all", "All"]].concat(H.DISCIPLINES);
    var q = new URLSearchParams(location.search);
    var disc = q.get("discipline") || "all";
    if (!discs.some(function (x) { return x[0] === disc; })) disc = "all";
    el("disc-nav").innerHTML = discs.map(function (x) {
      return '<a href="#" data-disc="' + x[0] + '"' + (x[0] === disc ? ' aria-current="page"' : "") + ">" + esc(x[1]) + "</a>";
    }).join("");
    el("disc-nav").addEventListener("click", function (e) {
      var a = e.target.closest("[data-disc]"); if (!a) return;
      e.preventDefault(); disc = a.getAttribute("data-disc");
      el("disc-nav").querySelectorAll("a").forEach(function (n) {
        if (n.getAttribute("data-disc") === disc) n.setAttribute("aria-current", "page");
        else n.removeAttribute("aria-current");
      });
      run();
    });
    if (q.get("q")) el("q").value = q.get("q");
    if (q.get("category") && cats.indexOf(q.get("category")) >= 0) el("f-cat").value = q.get("category");
    el("q").addEventListener("input", run); el("f-cat").addEventListener("change", run);
    function run() {
      var qq = nz(el("q").value), c = el("f-cat").value;
      var pool = V.filter(function (v) {
        if (disc === "all") return true;
        return (v.discipline || ["bouldering"]).indexOf(disc) >= 0;
      });
      var res = pool.filter(function (v) {
        return (c === "all" || v.category === c) && (!qq || [v.name].concat(v.aka, [v.definition, v.kid, v.little]).map(nz).join("|").indexOf(qq) >= 0);
      });
      var p = new URLSearchParams();
      if (el("q").value) p.set("q", el("q").value);
      if (c !== "all") p.set("category", c);
      if (disc !== "all") p.set("discipline", disc);
      history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : ""));
      el("count").textContent = res.length + " of " + pool.length + " terms";
      el("results").innerHTML = res.length ? '<table class="data"><thead><tr><th>Term</th><th>Category</th><th>Definition</th></tr></thead><tbody>' +
        res.map(function (v) {
          return '<tr><td><a class="name" href="' + H.termHref(v) + '">' + esc(v.name) + "</a>" +
            (v.aka.length ? '<span class="aka">' + esc(v.aka.slice(0, 2).join(", ")) + "</span>" : "") +
            "</td><td>" + esc(v.category) + "</td><td>" + esc(v.definition) + "</td></tr>";
        }).join("") + "</tbody></table>" : '<p class="muted">No matches.</p>';
    }
    run();
  }).catch(H.fail);
})();
