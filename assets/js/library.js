(function () {
  "use strict";
  var H = window.Hub, esc = H.esc, nz = H.nz;
  H.init("library.html");
  H.loadAll(["activities", "meta", "pages", "curricula"]).then(function (d) {
    var A = d.activities.items.slice().sort(function (x, y) { return x.name.localeCompare(y.name); }), M = d.meta;
    var ageShort = {}; M.ages.forEach(function (a) { ageShort[a.id] = a.short; });
    var typeLabel = {}; M.types.forEach(function (t) { typeLabel[t.id] = t.label; });
    var skills = Array.from(new Set([].concat.apply([], A.map(function (a) { return a.skills; })))).sort();
    var opt = function (v, l) { return '<option value="' + esc(v) + '">' + esc(l) + "</option>"; };
    var el = function (id) { return document.getElementById(id); };
    el("lib-intro").innerHTML = '<p class="lead">' + esc(d.pages.library.summary) + "</p>" +
      '<div class="callout"><strong>' + esc(d.pages.library.callout.lead) + "</strong>" + esc(d.pages.library.callout.text) + "</div>";
    el("f-type").innerHTML = opt("all", "All types") + M.types.map(function (t) { return opt(t.id, t.label); }).join("");
    el("f-age").innerHTML = opt("all", "All ages") + M.ages.map(function (a) { return opt(a.id, a.label); }).join("");
    el("f-skill").innerHTML = opt("all", "All skills") + skills.map(function (s) { return opt(s, s); }).join("");
    el("f-theme").innerHTML = opt("all", "All themes") + M.themes.map(function (t) { return opt(t.id, t.label); }).join("");
    var byAge = {};
    d.curricula.groups.forEach(function (g) { byAge[g.id] = g; });
    var q = new URLSearchParams(location.search);
    var F = { q: "q", type: "f-type", age: "f-age", skill: "f-skill", theme: "f-theme" };
    Object.keys(F).forEach(function (k) {
      var v = q.get(k); var e = el(F[k]);
      if (v && (k === "q" || Array.prototype.some.call(e.options, function (o) { return o.value === v; }))) e.value = v;
      e.addEventListener(k === "q" ? "input" : "change", run);
    });
    el("reset").addEventListener("click", function () { el("q").value = ""; ["f-type", "f-age", "f-skill", "f-theme"].forEach(function (i) { el(i).value = "all"; }); run(); });
    function run() {
      var qq = nz(el("q").value), ty = el("f-type").value, ag = el("f-age").value, sk = el("f-skill").value, th = el("f-theme").value;
      var res = A.filter(function (a) {
        return (ty === "all" || a.types.indexOf(ty) >= 0) && (ag === "all" || a.ages.indexOf(ag) >= 0) &&
          (sk === "all" || a.skills.indexOf(sk) >= 0) && (th === "all" || a.themes.indexOf(th) >= 0) &&
          (!qq || [a.name].concat(a.aka, a.skills, [a.setup, a.why, a.variations], a.steps).map(nz).join("|").indexOf(qq) >= 0);
      });
      var p = new URLSearchParams();
      if (el("q").value) p.set("q", el("q").value);
      if (ty !== "all") p.set("type", ty); if (ag !== "all") p.set("age", ag); if (sk !== "all") p.set("skill", sk); if (th !== "all") p.set("theme", th);
      history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : ""));
      var weekHost = el("this-week");
      if (weekHost) weekHost.innerHTML = byAge[ag] ? H.lessonCard(byAge[ag]) : "";
      el("count").textContent = res.length + " of " + A.length + " activities match. Tap one to open its full page.";
      el("results").innerHTML = res.map(function (a) {
        return '<a class="item th-' + esc(a.themes[0]) + '" href="' + H.actHref(a) + '"><h3>' + esc(a.name) + "</h3>" +
          (a.aka.length ? '<div class="meta">Also called: ' + esc(a.aka.join(", ")) + "</div>" : "") +
          '<div class="meta">' + esc(a.types.map(function (t) { return typeLabel[t] || t; }).join(" · ")) + " | " + esc(a.skills.join(", ")) + "</div>" +
          '<div class="meta">Ages: ' + esc(a.ages.map(function (x) { return ageShort[x] || x; }).join(", ")) + "</div></a>";
      }).join("") || '<p class="muted">No matches. Try fewer filters or a shorter search.</p>';
    }
    run();
  }).catch(H.fail);
})();
