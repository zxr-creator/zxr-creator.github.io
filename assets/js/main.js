/* xinrui zhong · site behaviour
   No dependencies. Everything degrades to a readable static page without JS. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  /* ───────── theme ───────── */
  function effectiveTheme() {
    var set = root.getAttribute("data-theme");
    if (set) return set;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function toggleTheme() {
    var next = effectiveTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    store("theme", next);
  }
  var themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);
  document.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    if (e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(tag)) return;
    if (e.key === "t" || e.key === "T") toggleTheme();
  });

  /* ───────── nav: border on scroll + active section ───────── */
  var nav = document.querySelector(".nav");
  function onScroll() { if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var links = Array.prototype.slice.call(document.querySelectorAll(".nav__links a"));
  if ("IntersectionObserver" in window && links.length) {
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        // News sits between research and papers; keep "research" lit there.
        if (id === "news") id = "research";
        if (id === "education") id = "experience";
        links.forEach(function (a) { a.classList.remove("is-active"); });
        if (byId[id]) byId[id].classList.add("is-active");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach(function (s) { spy.observe(s); });
  }

  /* ───────── email (assembled client-side) ───────── */
  document.querySelectorAll(".js-mail").forEach(function (a) {
    var addr = a.getAttribute("data-u") + "@" + a.getAttribute("data-d");
    a.setAttribute("href", "mailto:" + addr);
  });

  /* ───────── year ───────── */
  var y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());

  /* ───────── hero loop: v(n) → v(n+1) ───────── */
  (function loop() {
    var svg = document.querySelector(".loop");
    var L = document.getElementById("v-left");
    var R = document.getElementById("v-right");
    var C = document.getElementById("v-cap");
    if (!svg || !L || !R || !C || reduceMotion) return;
    var n = 0, timer = null;
    function tick() {
      n = (n + 1) % 100;
      L.textContent = String(n);
      R.textContent = String(n + 1);
      C.textContent = "v" + (n + 1) + " > v" + n;
      svg.classList.remove("is-tick");
      void svg.getBoundingClientRect();
      svg.classList.add("is-tick");
    }
    function start() { if (!timer) timer = setInterval(tick, 2600); }
    function stop() { clearInterval(timer); timer = null; }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting && !document.hidden) start(); else stop(); });
      }).observe(svg);
    } else { start(); }
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); });
  })();

  /* ───────── paper filters ───────── */
  var chips = Array.prototype.slice.call(document.querySelectorAll(".chip"));
  var pubs = Array.prototype.slice.call(document.querySelectorAll(".pub"));
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var f = chip.getAttribute("data-filter");
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
      pubs.forEach(function (p) {
        var tags = (p.getAttribute("data-tags") || "").split(/\s+/);
        p.classList.toggle("is-hidden", f !== "all" && tags.indexOf(f) === -1);
      });
    });
  });

  /* ───────── plates: every paper drawn as a small matrix ─────────
     g0 outline (skipped) · g1 soft (done) · g2 accent (computed/kept)
     g3 amber (special tier) · g4 ink · g5 faint accent · gd dashed (reused) */
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var COLS = 16, ROWS = 8;

  var glyphs = {
    risa: {
      x: "kv pages →", y: "step",
      legend: [["g2", "read plan"], ["g3", "recovery tier"]],
      cells: function () {
        var plan = [0, 4, 5, 9, 13, 14, 15], rec = [7, 11];
        return function (r, c) {
          if (plan.indexOf(c) > -1) return "g2";
          if (rec.indexOf(c) > -1) return "g3";
          return "g0";
        };
      }
    },
    vortex: {
      x: "keys →", y: "queries",
      legend: [["g2", "sink / local"], ["g3", "top-k"]],
      cells: function () {
        var R = rng(7);
        var picks = {};
        for (var r = 0; r < ROWS; r++) {
          var last = 2 * r + 1, k = 0, guard = 0;
          picks[r] = [];
          while (k < Math.min(2, Math.max(0, last - 3)) && guard++ < 50) {
            var c = 1 + Math.floor(R() * Math.max(1, last - 2));
            if (picks[r].indexOf(c) === -1) { picks[r].push(c); k++; }
          }
        }
        return function (r, c) {
          var last = 2 * r + 1;
          if (c > last) return null;
          if (c === 0 || c >= last - 1) return "g2";
          if (picks[r].indexOf(c) > -1) return "g3";
          return "g0";
        };
      }
    },
    serverbench: {
      x: "time →", y: "slots",
      legend: [["g3", "prefill"], ["g2", "decode"]],
      cells: function () {
        var R = rng(11), grid = [];
        for (var r = 0; r < ROWS; r++) {
          var row = [], t = Math.floor(R() * 3);
          for (var i = 0; i < t; i++) row.push("g0");
          while (row.length < COLS) {
            var p = 1 + Math.floor(R() * 2), d = 3 + Math.floor(R() * 5), g = Math.floor(R() * 2);
            for (i = 0; i < p; i++) row.push("g3");
            for (i = 0; i < d; i++) row.push("g2");
            for (i = 0; i < g; i++) row.push("g0");
          }
          grid.push(row.slice(0, COLS));
        }
        return function (r, c) { return grid[r][c]; };
      }
    },
    compressionbench: {
      x: "weight blocks →", y: "layers",
      legend: [["g2", "4-bit"], ["g5", "2-bit"], ["g4", "kept"]],
      cells: function () {
        var R = rng(23), grid = [];
        for (var r = 0; r < ROWS; r++) {
          var row = [];
          for (var c = 0; c < COLS; c++) {
            var p = R();
            if (c === 6 || c === 12) row.push("g0");         // structured pruning
            else if (p < 0.07) row.push("g0");               // unstructured pruning
            else if (p < 0.14) row.push("g4");               // outliers kept in BF16
            else if (p < 0.6) row.push("g2");
            else row.push("g5");
          }
          grid.push(row);
        }
        return function (r, c) { return grid[r][c]; };
      }
    },
    sparsp: {
      x: "sequence chunks →", y: "gpus",
      legend: [["g2", "local"], ["g3", "fetched"], ["gd", "skipped"]],
      cells: function () {
        var R = rng(5), grid = [];
        for (var r = 0; r < ROWS; r++) {
          var row = [];
          for (var c = 0; c < COLS; c++) {
            if (Math.floor(c / 2) === r) row.push("g2");
            else row.push(R() < 0.2 ? "g3" : "gd");
          }
          grid.push(row);
        }
        return function (r, c) { return grid[r][c]; };
      }
    },
    r2dllm: {
      x: "tokens →", y: "step",
      legend: [["g2", "recomputed"], ["gd", "reused"], ["g1", "committed"]],
      cells: function () {
        var R = rng(31), commit = [];
        for (var c = 0; c < COLS; c++) commit.push(2 + Math.floor(R() * 6));
        var grid = [];
        for (var r = 0; r < ROWS; r++) {
          var row = [];
          for (c = 0; c < COLS; c++) {
            if (r >= commit[c]) row.push("g1");
            else if (r === 0) row.push("g2");
            else row.push(R() < 0.5 ? "gd" : "g2");
          }
          grid.push(row);
        }
        return function (r, c) { return grid[r][c]; };
      }
    },
    genserve: {
      x: "time →", y: "gpus",
      legend: [["g2", "text→image"], ["g3", "text→video"]],
      cells: function () {
        var R = rng(17), grid = [];
        for (var r = 0; r < ROWS; r++) {
          var row = [];
          while (row.length < COLS) {
            var video = R() < 0.3, len = video ? 5 + Math.floor(R() * 3) : 1 + Math.floor(R() * 2);
            for (var i = 0; i < len; i++) row.push(video ? "g3" : "g2");
            if (R() < 0.45) row.push("g0");
          }
          grid.push(row.slice(0, COLS));
        }
        return function (r, c) { return grid[r][c]; };
      }
    },
    qrmark: {
      x: "tiles →", y: "", tile: 4,
      legend: [["g4", "bit"], ["g3", "corrected"]],
      cells: function () {
        var R = rng(41), grid = [];
        for (var r = 0; r < ROWS; r++) {
          var row = [];
          for (var c = 0; c < COLS; c++) row.push(R() < 0.48 ? "g4" : "g1");
          grid.push(row);
        }
        // finder-style corners
        [[0, 0], [0, 13], [5, 0]].forEach(function (o) {
          for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) grid[o[0] + a][o[1] + b] = (a === 1 && b === 1) ? "g2" : "g4";
        });
        [[2, 6], [4, 10], [6, 7], [3, 15], [7, 12]].forEach(function (p) { grid[p[0]][p[1]] = "g3"; });
        return function (r, c) { return grid[r][c]; };
      }
    }
  };

  var NS = "http://www.w3.org/2000/svg";
  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function drawPlate(fig, idx) {
    var spec = glyphs[fig.getAttribute("data-glyph")];
    if (!spec) return;
    var cell = 9, gap = 2.4, tileGap = spec.tile ? 3.5 : 0;
    var left = spec.y ? 12 : 0, bottom = 13;
    var gw = COLS * cell + (COLS - 1) * gap + (spec.tile ? (COLS / spec.tile - 1) * tileGap : 0);
    var gh = ROWS * cell + (ROWS - 1) * gap;
    var W = left + gw, H = gh + bottom;
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, "aria-hidden": "true" });
    var at = spec.cells();
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var cls = at(r, c);
        if (!cls) continue;
        var x = left + c * (cell + gap) + (spec.tile ? Math.floor(c / spec.tile) * tileGap : 0);
        var yy = r * (cell + gap);
        var inset = (cls === "g0" || cls === "gd") ? 0.4 : 0;
        svg.appendChild(el("rect", {
          x: (x + inset).toFixed(2), y: (yy + inset).toFixed(2),
          width: (cell - 2 * inset).toFixed(2), height: (cell - 2 * inset).toFixed(2),
          rx: 1.6, "class": cls
        }));
      }
    }
    var style = "font-family:var(--mono);font-size:7.5px;letter-spacing:.05em;fill:var(--ink-3)";
    var xl = el("text", { x: left, y: H - 2, style: style });
    xl.textContent = spec.x;
    svg.appendChild(xl);
    if (spec.y) {
      var yl = el("text", { x: 0, y: 0, style: style, transform: "translate(7 " + (gh / 2) + ") rotate(-90)", "text-anchor": "middle" });
      yl.textContent = spec.y;
      svg.appendChild(yl);
    }

    var box = document.createElement("div");
    box.className = "plate__box";
    box.appendChild(svg);

    var cap = document.createElement("figcaption");
    var num = String(idx + 1).padStart(2, "0");
    var b = document.createElement("b");
    b.textContent = "FIG. " + num;
    cap.appendChild(b);
    cap.appendChild(document.createTextNode(": " + (fig.getAttribute("data-cap") || "")));

    if (spec.legend) {
      var lg = document.createElement("span");
      lg.className = "plate__legend";
      spec.legend.forEach(function (item) {
        var it = document.createElement("span");
        var sw = el("svg", { viewBox: "0 0 10 10", width: 8, height: 8, "aria-hidden": "true" });
        sw.appendChild(el("rect", { x: 0.5, y: 0.5, width: 9, height: 9, rx: 2, "class": item[0] }));
        it.appendChild(sw);
        it.appendChild(document.createTextNode(item[1]));
        lg.appendChild(it);
      });
      cap.appendChild(lg);
    }

    fig.appendChild(box);
    fig.appendChild(cap);
  }
  document.querySelectorAll(".plate").forEach(drawPlate);

  /* ───────── live GitHub stars (cached 1h; silent on failure) ───────── */
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function paint(card, data) {
    var s = card.querySelector("[data-stars]");
    var p = card.querySelector("[data-pushed]");
    if (s) s.textContent = data && typeof data.stars === "number" ? data.stars.toLocaleString("en-US") : "·";
    if (p && data && data.pushed) {
      var d = new Date(data.pushed);
      if (!isNaN(d)) p.textContent = "last push · " + months[d.getUTCMonth()] + " " + d.getUTCFullYear();
    }
  }
  document.querySelectorAll(".repo[data-repo]").forEach(function (card) {
    var repo = card.getAttribute("data-repo");
    var key = "gh:" + repo;
    var cached = null;
    try { cached = JSON.parse(store(key) || "null"); } catch (e) { cached = null; }
    if (cached) paint(card, cached);
    if (cached && Date.now() - cached.t < 3600 * 1000) return;
    if (!window.fetch) return;
    fetch("https://api.github.com/repos/" + repo, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(function (j) {
        var data = { t: Date.now(), stars: j.stargazers_count, pushed: j.pushed_at };
        store(key, JSON.stringify(data));
        paint(card, data);
      })
      .catch(function () { if (!cached) paint(card, null); });
  });

  /* ───────── gentle reveal ───────── */
  if (!reduceMotion && "IntersectionObserver" in window) {
    var targets = document.querySelectorAll(".pillar, .pub, .repo, .tl, .log li, .edu__list li, .service");
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    targets.forEach(function (t) {
      var r = t.getBoundingClientRect();
      if (r.top < window.innerHeight) return; // already on screen: leave as-is
      t.classList.add("reveal");
      io.observe(t);
    });
  }
})();
