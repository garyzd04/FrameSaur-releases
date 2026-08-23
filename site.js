/* framesaur · site/site.js — vanilla port of the Claude Design draft's DCLogic:
   auto-cycling hero carousel + per-theme variant fans (until the visitor picks),
   the floating widget's layout cycle, word/rise reveals, hide-on-scroll nav,
   and the live version line from the public releases repo. No frameworks. */
(function () {
  "use strict";
  var CYCLE_SECONDS = 4, HERO_N = 9;
  var rm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var D = {
    dino:    { names: ["Classic Rex", "Hatchling", "Lava Roar"],   tags: ["The one that started it.", "Pastel, softer, still bites.", "Dark mode, molten."] },
    minimal: { names: ["Carbon", "Bone", "Olive"],                 tags: ["Nothing to prove.", "Gallery white, off duty.", "Matte. Quietly green."] },
    y2k:     { names: ["Frutiger Sky", "Bubblegum", "Cyber Lime"], tags: ["Forecast: 2003, forever.", "Pop, taken literally.", "Loud on purpose."] },
    space:   { names: ["Nebula", "Midnight", "Solar Flare"],       tags: ["Now orbiting.", "Our coldest blue.", "The warm side of deep space."] }
  };
  var v = { dino: 0, minimal: 0, y2k: 0, space: 0 };
  var auto = { dino: true, minimal: true, y2k: true, space: true };
  var h = 0, w = 0, ticks = 0;

  function $all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  /* ---- theme fans ---- */
  /* Two modes, one state. Desktop: the three variant cards fan into a stack and the front one rotates.
     Mobile (≤940px, the media query turns .ghosts into a scroll-snap ROW): these fan styles must never
     land — they are INLINE, so they beat the stylesheet, and the row ends up with two tilted quarter-
     opacity cards drifting every 4s. In row mode the pills scroll the row, a swipe drives the labels,
     and the auto-cycle keeps its hands off entirely. */
  var MOBILE = window.matchMedia ? matchMedia("(max-width:940px)") : { matches: false };
  var GHOST = [
    "opacity:1;transform:translate(0,0) scale(1) rotate(0deg);z-index:3",
    "opacity:.25;transform:translate(10%,-4.5%) scale(.92) rotate(2.5deg);z-index:1",
    "opacity:.25;transform:translate(-10%,4.5%) scale(.92) rotate(-2.5deg);z-index:1"
  ];
  function fanLabels(t) {
    var a = v[t];
    $all('[data-pick^="' + t + ':"]').forEach(function (b) {
      b.classList.toggle("sel", +b.getAttribute("data-pick").split(":")[1] === a);
    });
    var n = document.querySelector('[data-name-for="' + t + '"]');
    var g = document.querySelector('[data-tag-for="' + t + '"]');
    if (n) n.textContent = D[t].names[a];
    if (g) g.textContent = D[t].tags[a];
  }
  function applyThemeFan(t, scrollRow) {
    var a = v[t];
    $all('[data-ghost-slot^="' + t + ':"]').forEach(function (el) {
      var i = +el.getAttribute("data-ghost-slot").split(":")[1];
      if (MOBILE.matches) {
        el.style.opacity = ""; el.style.transform = ""; el.style.zIndex = "";  // let the row stylesheet win
        if (scrollRow && i === a) {
          var row = el.parentNode;                                             // centre the picked card; never
          setTimeout(function () {                                             // scrollIntoView — it drags the PAGE too.
            /* deferred past the style writes above: a reflow mid-smooth-scroll lets the mandatory snap
               cancel the animation and yank the row back. setTimeout, NOT requestAnimationFrame — rAF
               never fires while a page is occluded (backgrounded tab), and then the scroll never runs */
            row.scrollTo({ left: el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2, behavior: rm ? "auto" : "smooth" });
          }, 0);
        }
      } else {
        el.style.cssText += ";" + GHOST[(i - a + 3) % 3];
      }
    });
    fanLabels(t);
  }
  $all("[data-pick]").forEach(function (b) {
    var parts = b.getAttribute("data-pick").split(":");
    var go = function (e) {
      if (MOBILE.matches && e.type !== "click") return;                        // hover/focus picks are a desktop idea
      auto[parts[0]] = false;
      if (v[parts[0]] !== +parts[1]) { v[parts[0]] = +parts[1]; applyThemeFan(parts[0], true); }
    };
    b.addEventListener("click", go); b.addEventListener("mouseenter", go); b.addEventListener("focus", go);
  });
  /* row mode: a swipe IS the variant picker — whichever card settles nearest centre drives the labels.
     scrollend (fires once the snap settles) where the engine has it, debounced scroll everywhere else. */
  $all(".ghosts").forEach(function (row) {
    var first = row.querySelector("[data-ghost-slot]"); if (!first) return;
    var t = first.getAttribute("data-ghost-slot").split(":")[0], timer = 0;
    var sync = function () {
      if (!MOBILE.matches) return;
      var mid = row.scrollLeft + row.clientWidth / 2, best = 0, bd = 1e9;
      $all('[data-ghost-slot^="' + t + ':"]').forEach(function (el) {
        var d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
        if (d < bd) { bd = d; best = +el.getAttribute("data-ghost-slot").split(":")[1]; }
      });
      auto[t] = false;
      if (v[t] !== best) { v[t] = best; fanLabels(t); }                        // labels only — no scrollTo, no loop
    };
    if ("onscrollend" in row) row.addEventListener("scrollend", sync);
    row.addEventListener("scroll", function () {
      if (!MOBILE.matches) return;
      clearTimeout(timer); timer = setTimeout(sync, 140);
    }, { passive: true });
  });
  /* crossing the breakpoint re-applies every fan, so desktop inline styles never haunt the row (or vice versa) */
  if (MOBILE.addEventListener) MOBILE.addEventListener("change", function () {
    for (var t in v) applyThemeFan(t, false);
  });

  /* ---- hero coverflow ---- */
  function heroStyle(i) {
    var sd = ((i - h) % HERO_N + HERO_N) % HERO_N; if (sd > HERO_N / 2) sd -= HERO_N;
    var x = Math.sign(sd), a = Math.abs(sd);
    if (a === 0) return "transform:translate(0,0) scale(1);opacity:1;filter:blur(0) drop-shadow(0 40px 70px rgba(0,0,0,.55));z-index:5";
    if (a === 1) return "transform:translateX(" + x * 265 + "px) scale(.84);opacity:.5;filter:blur(2.5px) drop-shadow(0 28px 50px rgba(0,0,0,.45));z-index:4";
    if (a === 2) return "transform:translateX(" + x * 485 + "px) scale(.72);opacity:.22;filter:blur(5px) drop-shadow(0 20px 40px rgba(0,0,0,.4));z-index:3";
    return "transform:translateX(" + (x || 1) * 660 + "px) scale(.6);opacity:0;filter:blur(8px);z-index:1";
  }
  function applyHero() {
    $all("[data-hero-slot]").forEach(function (el) {
      el.style.cssText += ";" + heroStyle(+el.getAttribute("data-hero-slot"));
    });
  }

  /* ---- widget layout cycle ---- */
  var WSCALE = [1, 1, 1, 1]; // slot 3 was the tall story card (0.86); it cycles a Cat Nap portrait now
  function applyWidget() {
    $all("[data-widget-slot]").forEach(function (el) {
      var i = +el.getAttribute("data-widget-slot");
      el.style.cssText += ";" + (i === w
        ? "opacity:1;transform:translateX(0) scale(" + WSCALE[i] + ");z-index:2;transition:opacity .05s linear .9s,transform 1.1s cubic-bezier(.2,.7,.2,1) 1s"
        : "opacity:0;transform:translateX(200%) scale(.98);z-index:1;pointer-events:none;transition:opacity .05s linear .95s,transform 1s cubic-bezier(.55,.06,.68,.19)");
    });
  }

  /* ---- the clock ---- */
  if (!rm) setInterval(function () {
    if (document.hidden) return;
    ticks++;
    /* fans auto-advance on desktop only — auto-scrolling a row someone's thumb might be on is hostile */
    if (!MOBILE.matches) for (var t in auto) if (auto[t]) { v[t] = (v[t] + 1) % 3; applyThemeFan(t); }
    h = (h + 1) % HERO_N; applyHero();
    if (ticks % 2 === 0) { w = (w + 1) % 4; applyWidget(); }
  }, CYCLE_SECONDS * 1000);

  /* ---- reveals ---- */
  function reveal(el, instant) {
    var set = function (n) { if (instant) n.style.transition = "none"; n.style.opacity = "1"; n.style.transform = "translateY(0)"; };
    if (el.hasAttribute("data-rise")) set(el);
    el.querySelectorAll("[data-w]").forEach(set);
  }
  var targets = $all("[data-reveal],[data-rise]");
  if (rm || !("IntersectionObserver" in window)) targets.forEach(function (el) { reveal(el, true); });
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.2 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---- nav hide on scroll down ---- */
  var lastY = window.scrollY, raf = 0;
  window.addEventListener("scroll", function () {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      var nav = document.getElementById("fs-nav"); if (!nav) return;
      var y = window.scrollY;
      nav.style.transform = (y > lastY && y > 120) ? "translateY(-110%)" : "translateY(0)";
      lastY = y;
    });
  }, { passive: true });

  /* ---- live version + direct installer link ---- */
  fetch("https://api.github.com/repos/garyzd04/FrameSaur-releases/releases/latest")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (rel) {
      if (!rel || !rel.tag_name) return;
      var vEl = document.querySelector("[data-version]");
      if (vEl) vEl.textContent = rel.tag_name + " · Windows 10/11 · installer + portable";
      var setup = (rel.assets || []).filter(function (a) { return /^FrameSaur-Setup-.*\.exe$/.test(a.name); })[0];
      if (setup) $all("[data-download-link]").forEach(function (a) { a.href = setup.browser_download_url; });
    })
    .catch(function () {});
})();
