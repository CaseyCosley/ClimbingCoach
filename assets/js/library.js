(function () {
  "use strict";
  var H = window.Hub, esc = H.esc, nz = H.nz;
  H.init("library.html");
  H.loadAll(["activities", "vocabulary", "meta", "curricula"]).then(function (d) {
    var A = d.activities.items.slice().sort(function (x, y) { return x.name.localeCompare(y.name); });
    var V = d.vocabulary.items.slice().sort(function (x, y) { return x.name.localeCompare(y.name); });
    var M = d.meta;
    var ageShort = {}; M.ages.forEach(function (a) { ageShort[a.id] = a.short; });
    var typeLabel = {}; M.types.forEach(function (t) { typeLabel[t.id] = t.label; });
    var skills = Array.from(new Set([].concat.apply([], A.map(function (a) { return a.skills; })))).sort();
    var opt = function (v, l) { return '<option value="' + esc(v) + '">' + esc(l) + "</option>"; };
    var el = function (id) { return document.getElementById(id); };
    el("f-type").innerHTML = opt("all", "All types") + M.types.map(function (t) { return opt(t.id, t.label); }).join("");
    el("f-age").innerHTML = opt("all", "All ages") + M.ages.map(function (a) { return opt(a.id, a.label); }).join("");
    el("f-skill").innerHTML = opt("all", "All skills") + skills.map(function (s) { return opt(s, s); }).join("");
    el("f-theme").innerHTML = opt("all", "All themes") + M.themes.map(function (t) { return opt(t.id, t.label); }).join("");
    var discs = [["all", "All"]].concat(H.DISCIPLINES);
    var q = new URLSearchParams(location.search);
    var disc = q.get("discipline") || "all";
    if (!discs.some(function (x) { return x[0] === disc; })) disc = "all";
    el("disc-nav").innerHTML = discs.map(function (x) {
      return '<a href="#" data-disc="' + x[0] + '"' + (x[0] === disc ? ' aria-current="page"' : "") + ">" + esc(x[1]) + "</a>";
    }).join("");
    el("disc-nav").addEventListener("click", function (e) {
      var a = e.target.closest("[data-disc]"); if (!a) return;
      e.preventDefault();
      disc = a.getAttribute("data-disc");
      el("disc-nav").querySelectorAll("a").forEach(function (n) {
        if (n.getAttribute("data-disc") === disc) n.setAttribute("aria-current", "page");
        else n.removeAttribute("aria-current");
      });
      run();
    });
    var F = { q: "q", type: "f-type", age: "f-age", skill: "f-skill", theme: "f-theme" };
    Object.keys(F).forEach(function (k) {
      var v = q.get(k); var e = el(F[k]);
      if (v && (k === "q" || Array.prototype.some.call(e.options, function (o) { return o.value === v; }))) e.value = v;
      e.addEventListener(k === "q" ? "input" : "change", run);
    });
    el("reset").addEventListener("click", function () {
      el("q").value = ""; disc = "all";
      ["f-type", "f-age", "f-skill", "f-theme"].forEach(function (i) { el(i).value = "all"; });
      el("disc-nav").querySelectorAll("a").forEach(function (n) {
        if (n.getAttribute("data-disc") === "all") n.setAttribute("aria-current", "page");
        else n.removeAttribute("aria-current");
      });
      var gq = document.getElementById("global-q"); if (gq) gq.value = "";
      run();
    });
    function hasDisc(item) {
      if (disc === "all") return true;
      var list = item.discipline || ["bouldering"];
      return list.indexOf(disc) >= 0;
    }
    function run() {
      var qq = nz(el("q").value), ty = el("f-type").value, ag = el("f-age").value, sk = el("f-skill").value, th = el("f-theme").value;
      var pool = A.filter(hasDisc);
      var res = pool.filter(function (a) {
        return (ty === "all" || a.types.indexOf(ty) >= 0) && (ag === "all" || a.ages.indexOf(ag) >= 0) &&
          (sk === "all" || a.skills.indexOf(sk) >= 0) && (th === "all" || a.themes.indexOf(th) >= 0) &&
          (!qq || [a.name].concat(a.aka, a.skills, [a.setup, a.why, a.variations], a.steps).map(nz).join("|").indexOf(qq) >= 0);
      });
      var p = new URLSearchParams();
      if (el("q").value) p.set("q", el("q").value);
      if (disc !== "all") p.set("discipline", disc);
      if (ty !== "all") p.set("type", ty); if (ag !== "all") p.set("age", ag); if (sk !== "all") p.set("skill", sk); if (th !== "all") p.set("theme", th);
      history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : ""));
      el("count").textContent = res.length + " of " + pool.length + " activities" + (disc === "all" ? "" : " in " + H.discLabel(disc));
      el("results").innerHTML = res.length ? '<table class="data"><thead><tr><th>Activity</th><th>Type</th><th>Ages</th><th>Discipline</th></tr></thead><tbody>' +
        res.map(function (a) {
          return "<tr><td><a class=\"name\" href=\"" + H.actHref(a) + "\">" + esc(a.name) + "</a>" +
            (a.aka.length ? '<span class="aka">' + esc(a.aka.slice(0, 2).join(", ")) + "</span>" : "") + "</td><td>" +
            esc(a.types.map(function (t) { return typeLabel[t] || t; }).join(", ")) + "</td><td>" +
            esc(a.ages.map(function (x) { return ageShort[x] || x; }).join(", ")) + "</td><td>" +
            esc((a.discipline || ["bouldering"]).map(H.discLabel).join(", ")) + "</td></tr>";
        }).join("") + "</tbody></table>" : '<p class="muted">No activities match. Try fewer filters or a shorter search.</p>';
      var terms = [];
      if (qq) {
        terms = V.filter(function (v) {
          return hasDisc(v) && [v.name].concat(v.aka, [v.definition, v.kid, v.little]).map(nz).join("|").indexOf(qq) >= 0;
        });
      }
      el("term-hits").innerHTML = terms.length ? '<h2 class="term-hits">Terms</h2><p class="result-line">' + terms.length +
        ' matching terms</p><table class="data"><thead><tr><th>Term</th><th>Category</th></tr></thead><tbody>' +
        terms.map(function (v) {
          return '<tr><td><a class="name" href="' + H.termHref(v) + '">' + esc(v.name) + "</a></td><td>" + esc(v.category) + "</td></tr>";
        }).join("") + "</tbody></table>" : "";
    }
    run();
  }).catch(H.fail);
})();
