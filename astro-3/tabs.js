/*
 * "Who needs care?" tabs for Astro 3. Without JavaScript both programs show
 * one after the other and the tab buttons stay hidden.
 */
(function () {
  "use strict";
  var list = document.querySelector('[role="tablist"]');
  if (!list) return;
  var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute("aria-controls")); });

  panels.forEach(function (p, i) {
    p.setAttribute("role", "tabpanel");
    p.setAttribute("aria-labelledby", tabs[i].id);
    p.setAttribute("tabindex", "0");
  });

  function select(i, focus) {
    tabs.forEach(function (t, j) {
      var on = i === j;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      panels[j].hidden = !on;
    });
    if (focus) tabs[i].focus();
  }

  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { select(i); });
    t.addEventListener("keydown", function (e) {
      var n = tabs.length, next = null;
      if (e.key === "ArrowRight") next = (i + 1) % n;
      else if (e.key === "ArrowLeft") next = (i - 1 + n) % n;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = n - 1;
      if (next !== null) { e.preventDefault(); select(next, true); }
    });
  });

  // The GAPP / ICWP tiles in the hero open the matching tab.
  Array.prototype.slice.call(document.querySelectorAll("[data-tab-link]")).forEach(function (a) {
    a.addEventListener("click", function () {
      var i = tabs.findIndex(function (t) { return t.id === a.getAttribute("data-tab-link"); });
      if (i >= 0) select(i);
    });
  });

  list.hidden = false;
  select(0);
})();
