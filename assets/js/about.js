(function () {
  "use strict";
  var H = window.Hub, esc = H.esc;
  H.init("about.html");
  H.loadAll(["pages", "sources", "activities", "vocabulary", "playbook", "curricula"]).then(function (d) {
    var L = d.pages.library, C = d.pages.curricula, S = d.sources, PB = d.playbook;
    var cite = function (t) { return H.cite(t, "playbook.html#src-"); };
    var ul = function (items) {
      return "<ul>" + items.map(function (x) {
        return typeof x === "string" ? "<li>" + cite(x) + "</li>" : "<li><b>" + cite(x.text) + "</b>" + ul(x.items) + "</li>";
      }).join("") + "</ul>";
    };
    var CAT = d.curricula.categories;
    document.getElementById("curricula-how").innerHTML = "<p>" + esc(C.summary) + "</p><ul>" +
      C.how.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" +
      '<div class="callout"><strong>' + esc(C.callout.lead) + "</strong>" + esc(C.callout.text) + "</div>" +
      '<ul class="theme-key">' + Object.keys(CAT).map(function (k) {
        return '<li' + (k === "fun" ? ' class="review-key"' : "") + ">" + esc(CAT[k].label) + "</li>";
      }).join("") + "</ul>" +
      "<h3>Views</h3><ul>" + (C.views || []).map(function (v) {
        return "<li><b>" + esc(v.name) + "</b> " + esc(v.text) + "</li>";
      }).join("") + "</ul>" +
      "<h3>Age groups</h3><ul>" + d.curricula.groups.map(function (g) {
        return "<li><b>" + esc(g.name) + "</b> " + esc(g.intro) + "</li>";
      }).join("") + "</ul>";
    document.getElementById("library-how").innerHTML = "<p>" + esc(L.summary) + "</p>";
    document.getElementById("playbook-how").innerHTML = "<p>" + cite(PB.summary) + "</p>" +
      "<h3>" + esc(PB.principles.heading) + "</h3>" +
      '<div class="callout"><strong>' + esc(PB.principles.callout.lead) + "</strong>" + esc(PB.principles.callout.text) + "</div>" +
      ul(PB.principles.bullets) + "<p>" + cite(PB.principles.text) + "</p>" +
      "<h3>" + esc(PB.gameTheory.heading) + "</h3><p>" + cite(PB.gameTheory.intro) + "</p>" + ul(PB.gameTheory.bullets) +
      "<h3>" + esc(PB.gaps.heading) + "</h3>" +
      '<div class="callout"><strong>' + esc(PB.gaps.callout.lead) + "</strong>" + esc(PB.gaps.callout.text) + "</div>" +
      ul(PB.gaps.bullets);
    var cp = d.activities.items.filter(function (a) { return a.sources.some(function (k) { return !S.library[k]; }); }).length;
    var count = {}; d.activities.items.forEach(function (a) { a.sources.forEach(function (k) { count[k] = (count[k] || 0) + 1; }); });
    document.getElementById("lib-about").innerHTML = '<div class="callout"><strong>' + esc(L.callout.lead) + "</strong>" + esc(L.callout.text) + "</div><p>" + esc(L.text) + "</p>" +
      '<dl class="props"><dt>Last updated</dt><dd>' + esc(d.activities.lastUpdated) + "</dd><dt>Activities</dt><dd>" + d.activities.items.length + "</dd><dt>Vocabulary terms</dt><dd>" + d.vocabulary.items.length +
      "</dd><dt>Published library sources cited</dt><dd>" + Object.keys(S.library).length + "</dd><dt>Activities citing coaching practice</dt><dd>" + cp + "</dd></dl>";
    document.getElementById("dedup-steps").innerHTML = '<ol class="steps">' + L.dedup.map(function (s) { return "<li><b>" + esc(s.title) + "</b>" + esc(s.detail) + "</li>"; }).join("") + "</ol>";
    document.getElementById("lib-sources").innerHTML = '<ol class="sources">' + Object.keys(S.library).map(function (k) {
      var s = S.library[k];
      return '<li id="lib-' + esc(k) + '"><a href="' + esc(s.href) + '" rel="noopener">' + esc(s.title) + '</a> <span class="muted small">(' + esc(s.site) + ") · cited by " + (count[k] || 0) + " activities</span></li>";
    }).join("") + "<li>" + esc(S.coachingPractice) + ' <span class="muted small">· ' + cp + " activities</span></li></ol>";
    document.getElementById("pb-sources").innerHTML = '<ol class="sources">' + S.playbook.map(function (s, i) {
      return '<li><a href="' + esc(s.href) + '" rel="noopener">' + esc(s.title) + '</a> <span class="muted small">(' + esc(s.site) + ') · <a href="playbook.html#src-' + (i + 1) + '">[' + (i + 1) + "] in the Playbook</a></span></li>";
    }).join("") + "</ol>";
    var rel = d.pages.curricula.related.filter(function (l) { return l.href.indexOf("cursor.com") < 0; });
    document.getElementById("other-sources").innerHTML = "<ul>" + rel.map(function (l) { return '<li><a href="' + esc(l.href) + '" rel="noopener">' + esc(l.title) + '</a> <span class="muted small">(' + esc(l.site) + ")</span></li>"; }).join("") + "</ul>";
  }).catch(H.fail);
})();
