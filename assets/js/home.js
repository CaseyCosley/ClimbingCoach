(function () {
  "use strict";
  var H = window.Hub, esc = H.esc;
  H.init("index.html");
  H.loadAll(["activities", "vocabulary", "curricula", "playbook"]).then(function (d) {
    var weeks = d.curricula.groups.reduce(function (s, g) { return s + g.weeks.length; }, 0);
    document.getElementById("stats").innerHTML = [
      [d.curricula.groups.length, "age groups"], [weeks, "weekly plans"], [d.activities.items.length, "activities"], [d.vocabulary.items.length, "vocabulary terms"]
    ].map(function (x) { return '<div class="stat"><b>' + x[0] + "</b>" + x[1] + "</div>"; }).join("");
    var P = d.playbook.principles;
    document.getElementById("principles").innerHTML = '<div class="callout"><strong>' + esc(P.callout.lead) + "</strong>" + esc(P.callout.text) + "</div><ul>" +
      P.bullets.map(function (b) { return "<li>" + H.cite(b, "playbook.html#src-") + "</li>"; }).join("") + '</ul><p><a href="playbook.html#principles">Read the research behind these principles →</a></p>';
    var cmp = {}; d.playbook.comparison.rows.forEach(function (r) { cmp[H.nz(r[0])] = r; });
    document.getElementById("ages").innerHTML = d.curricula.groups.map(function (g) {
      var r = cmp[H.nz(g.name)];
      var s = H.seasonWeek(), month = g.months[s.m], plan = g.weeks[s.m * 4 + s.w];
      return '<a class="card age-card" href="' + H.lessonHref(g.id) + '">' +
        '<span class="kicker">This week\'s lesson · ' + esc(month.m) + " · Week " + (s.w + 1) + "</span>" +
        "<b>" + esc(plan.skill) + "</b>" +
        '<span class="muted small">' + esc(g.name) + " · " + esc(month.theme) + "</span>" +
        '<span class="muted small">' + g.minutes + " min class" + (r ? " · " + esc(r[1]) + " · " + esc(r[2]) : "") + "</span></a>";
    }).join("");
  }).catch(H.fail);
})();
