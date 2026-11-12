(function () {
  "use strict";
  var H = window.Hub, esc = H.esc;
  H.init("index.html");
  H.loadAll(["activities", "vocabulary", "curricula"]).then(function (d) {
    var aIdx = H.indexByName(d.activities.items);
    var byId = {};
    d.activities.items.forEach(function (a) { byId[a.id] = a; });
    var vIdx = H.indexByName(d.vocabulary.items);
    var featured = d.curricula.groups.filter(function (g) { return g.id === "ages-6-9"; })[0] || d.curricula.groups[0];
    var s = H.seasonWeek();
    var month = featured.months[s.m];
    var plan = featured.weeks[s.m * 4 + s.w];
    var when = new Date();
    var kicker = when.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) +
      " · " + month.m + " · Week " + (s.w + 1);
    function focusBlock(plan) {
      var links = (plan.focusActivities || []).map(function (id) {
        var a = byId[id];
        return a ? '<a href="' + H.actHref(a) + '">' + esc(a.name) + "</a>" : esc(id);
      });
      var learns = (plan.learnings || []).map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("");
      return (links.length ? '<p class="note"><b>Focus activities.</b> ' + links.join(", ") + "</p>" : "") +
        (learns ? '<p class="note"><b>Learnings.</b></p><ul class="learn-list">' + learns + "</ul>" : "");
    }
    function actLink(name) {
      var a = aIdx[H.nz(name)];
      return a ? '<a class="act" href="' + H.actHref(a) + '">' + esc(name) + "</a>" : esc(name);
    }
    var blocks = featured.blocks.map(function (b) {
      var name = { W: plan.warm, D: plan.drill, G: plan.game }[b.slot];
      var note = b.slot === "W" ? "Off the wall. Raise heart rate and loosen joints before climbing."
        : b.slot === "D" ? "Bouldering · Drill. Teach: " + plan.skill + "."
        : "Bouldering · Game.";
      return "<tr><td class=\"mins\">" + b.min + "<span>min</span></td><td>" + esc(b.label) + "</td><td>" +
        actLink(name) + "</td><td>" + esc(note) + "</td></tr>";
    }).join("");
    var vocab = plan.vocab.slice(0, 2).map(function (name) {
      var t = vIdx[H.nz(name)];
      var say = (d.curricula.weekVocab[name] || [""])[0];
      var link = t ? '<a href="' + H.termHref(t) + '">' + esc(name) + "</a>" : esc(name);
      return link + (say ? " — " + esc(say) : "");
    }).join(" · ");
    var ages = d.curricula.groups.map(function (g) {
      var gm = g.months[s.m], gp = g.weeks[s.m * 4 + s.w];
      return '<a href="' + H.lessonHref(g.id) + '"><span class="n">' + esc(g.name) + '</span><span class="m">' + g.minutes +
        ' min</span><span class="s">' + esc(gp.skill) + " · " + esc(gm.theme) + "</span></a>";
    }).join("");
    document.getElementById("home").innerHTML =
      '<p class="kicker">' + esc(kicker) + "</p>" +
      '<section class="plan" aria-labelledby="this-week">' +
      '<div class="plan-meta"><span>Here\'s this week\'s plan</span><span>' + esc(featured.name) + "</span><span>" +
      featured.minutes + ' minutes</span><span>Bouldering</span><span>' + esc(month.theme) + "</span></div>" +
      '<h1 id="this-week">' + esc(plan.skill) + "</h1>" +
      '<p class="skill">' + esc(plan.type) + " · school-year week " + (s.m * 4 + s.w + 1) + " of 40</p>" +
      '<table class="blocks"><thead><tr><th>Time</th><th>Block</th><th>Activity</th><th>Notes</th></tr></thead><tbody>' +
      blocks + "</tbody></table>" +
      '<p class="note"><b>Vocabulary.</b> ' + vocab + "</p>" +
      focusBlock(plan) +
      '<div class="actions"><a class="btn" href="' + H.lessonHref(featured.id) + '">See the full lesson card</a>' +
      '<a class="btn ghost" href="library.html?discipline=bouldering">Look up this week\'s activities</a></div></section>' +
      '<div class="split"><section><h2>Age groups</h2>' +
      '<p class="note" style="margin-top:0">What each group is working on this week. Times are the class length.</p>' +
      '<nav class="index" aria-label="Age groups">' + ages + "</nav></section>" +
      '<section><h2>Discipline</h2>' +
      '<p class="note" style="margin-top:0">Start from a discipline. Lead is for Ages 12+ and Ages 14+.</p>' +
      '<nav class="disc-index" aria-label="Disciplines">' +
      '<a href="curricula.html?discipline=bouldering"><span>Bouldering</span><span class="m">This week\'s plan and the library</span></a>' +
      '<a href="curricula.html?discipline=auto-belay"><span>Auto belay</span><span class="m">Staff permission required</span></a>' +
      '<a href="curricula.html?group=ages-9-12&amp;discipline=top-rope"><span>Top rope</span><span class="m">Sample lessons, including a systems intro</span></a>' +
      '<a href="curricula.html?group=ages-12-plus&amp;discipline=lead"><span>Lead</span><span class="m">Ages 12+ and 14+</span></a>' +
      "</nav></section></div>";
  }).catch(H.fail);
})();
