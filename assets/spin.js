/* Fran X Gotcha matcha spin (gotcha-hq DECISIONS 11 Nov 2026). The SERVER draws every prize and keeps one spin per phone; this page
   only turns the wheel to what the server answered and shows the voucher. Phone id: made by the server, kept on this phone, sent in
   request bodies only. Fun (owner ~04:50 "just make it fun"): rim lights, a tick per slice, a whisk that wobbles, a "ding ding ding"
   chime and a glitter burst on landing. No casino pictures or words (GRA bans images of gambling articles). Plain ES5-style code. */
(function () {
  'use strict';
  var LIVE = 'https://gotcha-spin.long-fog-ae60.workers.dev', STAGING = 'https://gotcha-spin-staging.long-fog-ae60.workers.dev';
  var API = location.protocol === 'file:' ? STAGING : LIVE;   // staging only from a copy opened on the Mac (review 11 Nov: no public switch)
  var FAKE = typeof window.SPIN_FAKE === 'function' ? window.SPIN_FAKE : null;   // the owner's mock-up only (pretend server)
  var VOUCHER_URL = 'https://gotchamatcha2025.github.io/spin/v/#';   // what the voucher QR opens (the staff scan, from 15 Nov)
  // a test spin on staging is kept apart, so it can never show up later as this phone's real voucher
  var SUFFIX = API === STAGING ? '-staging' : '', KEY_DEV = 'gm-spin-device' + SUFFIX, KEY_V = 'gm-spin-voucher' + SUFFIX, KEY_SND = 'gm-spin-sound';

  var P = {
    foam: { name: 'free cold foam', how: 'added to any drink you buy', label: 'cold foam', fill: '#FFFFFF' },
    up:   { name: 'free upsize',    how: 'on any drink you buy',       label: 'upsize',    fill: '#DCE8D2' },
    one:  { name: '1-for-1',        how: 'buy one, get a 2nd (same or lower price) free', label: '1-for-1', fill: '#F2B15C', alt: true, big: true },
    free: { name: 'a free drink',   how: 'any drink, regular size',     label: 'free drink', fill: '#24382C', inv: true, big: true }
  };
  // slices clockwise from the top, sized to the real chance: cold foam 60% = 4 × 54°, upsize 20% = 2 × 36°, 1-for-1 15% = 2 × 27°,
  // free drink 5% = 18°
  var ORDER = [['foam', 54], ['up', 36], ['foam', 54], ['one', 27], ['free', 18], ['foam', 54], ['up', 36], ['foam', 54], ['one', 27]];
  var SL = [], a0 = 0, i;
  for (i = 0; i < ORDER.length; i++) { SL.push({ k: ORDER[i][0], a0: a0, a1: a0 + ORDER[i][1] }); a0 += ORDER[i][1]; }
  var BULBS = 24;

  var $ = function (id) { return document.getElementById(id); };
  var store = {
    get: function (k) { if (FAKE && k !== KEY_SND) return null; try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { if (FAKE && k !== KEY_SND) return; try { window.localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var S = { device: store.get(KEY_DEV), rot: 0, gone: [], busy: false, timer: 0, status: '' };

  // ---------- sound (Web Audio: made on the phone, no files; starts only after a tap) ----------
  var AC = null, soundOn = store.get(KEY_SND) !== 'off';
  function audio() {
    if (!soundOn) return null;
    try {
      if (!AC) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); }
      if (AC.state === 'suspended') AC.resume();
      return AC;
    } catch (e) { return null; }
  }
  function tone(freq, at, dur, type, vol) {
    var a = audio(); if (!a) return;
    try {
      var o = a.createOscillator(), g = a.createGain(), t = a.currentTime + (at || 0);
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { /* no sound is fine */ }
  }
  function tick() { tone(2400, 0, 0.03, 'triangle', 0.07); }
  function ding(big) {   // ding ding ding (a bell: the note + a soft octave); the big prizes get a longer run and a sparkle trill
    var notes = big ? [1318.5, 1568, 2093, 1568, 2093, 2637] : [1318.5, 1568, 2093], n;
    for (n = 0; n < notes.length; n++) { tone(notes[n], n * 0.14, 0.8, 'sine', 0.24); tone(notes[n] * 2, n * 0.14, 0.4, 'sine', 0.05); }
    if (big) for (n = 0; n < 10; n++) tone(2637 + n * 160, notes.length * 0.14 + n * 0.04, 0.2, 'sine', 0.05);
  }
  function setSound(on, quiet) {
    soundOn = on; store.set(KEY_SND, on ? 'on' : 'off');
    var b = $('snd'); if (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.textContent = on ? '♪ sound on' : '♪ sound off'; }
    if (on && !quiet) tick();
  }

  // ---------- the wheel ----------
  var CX = 160, CY = 196, R = 138;
  function pt(r, deg) { var t = (deg - 90) * Math.PI / 180; return [CX + r * Math.cos(t), CY + r * Math.sin(t)]; }
  function arc(x0, x1) {
    var p0 = pt(R, x0), p1 = pt(R, x1);
    return 'M' + CX + ' ' + CY + 'L' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + 'A' + R + ' ' + R + ' 0 ' + ((x1 - x0) > 180 ? 1 : 0) + ' 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2) + 'Z';
  }
  function wheelSvg() {
    var s = '<svg viewBox="0 0 320 350" aria-hidden="true">' +
      '<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#E4E7E2"/><line x1="0" y1="0" x2="0" y2="6" stroke="#B9C2BB" stroke-width="2"/></pattern></defs>' +
      '<ellipse cx="160" cy="340" rx="112" ry="8" fill="rgba(36,56,44,.10)"/>' +
      '<circle cx="160" cy="196" r="153" fill="#fff" stroke="#24382C" stroke-width="3.2"/>' +
      '<g class="rot" id="rot" style="transform:rotate(' + S.rot + 'deg)">';
    var labels = '', k;
    for (k = 0; k < SL.length; k++) {
      var x = SL[k], p = P[x.k], gone = S.gone.indexOf(x.k) >= 0, mid = (x.a0 + x.a1) / 2;
      s += '<path d="' + arc(x.a0, x.a1) + '" fill="' + (gone ? 'url(#hatch)' : p.fill) + '" stroke="#24382C" stroke-width="2" stroke-linejoin="round"/>';
      var q = pt(R * 0.6, mid), ang = mid - 90 + (mid > 180 ? 180 : 0);
      labels += '<text class="wl' + (p.alt ? ' alt' : '') + (p.inv && !gone ? ' inv' : '') + '" x="' + q[0].toFixed(1) + '" y="' + q[1].toFixed(1) +
        '" text-anchor="middle" dominant-baseline="middle" transform="rotate(' + ang.toFixed(1) + ' ' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')">' + p.label + '</text>';
      if (x.k === 'free') {
        var st = pt(R - 12, mid);
        labels += '<path transform="translate(' + st[0].toFixed(1) + ' ' + st[1].toFixed(1) + ')" d="M0-8 2.4-2.5 8.2-2.5 3.5 1 5.3 6.8 0 3.3-5.3 6.8-3.5 1-8.2-2.5-2.4-2.5Z" fill="#F2B15C" stroke="#24382C" stroke-width="1.4" stroke-linejoin="round"/>';
      }
    }
    s += labels + '</g><g id="bulbs">';
    for (k = 0; k < BULBS; k++) { var b = pt(145.5, k * 360 / BULBS); s += '<circle class="bulb" cx="' + b[0].toFixed(1) + '" cy="' + b[1].toFixed(1) + '" r="3.6"/>'; }
    s += '</g>' +
      '<circle cx="160" cy="196" r="138" fill="none" stroke="#24382C" stroke-width="3.2"/>' +
      '<circle cx="160" cy="196" r="30" fill="#fff" stroke="#24382C" stroke-width="3"/>' +
      '<image href="' + (window.SPIN_HAND || 'assets/img/logo-hand.svg') + '" x="148" y="178" width="24" height="35"/>' +
      '<g class="whisk" id="whisk" stroke="#24382C" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">' +
      '<rect x="153" y="0" width="14" height="26" rx="5" fill="#D8C2A8"/>' +
      '<path d="M146 26 H174 C176 40 170 56 160 70 C150 56 144 40 146 26Z" fill="#fff"/>' +
      '<path d="M153 30 L158 62 M160 30 V67 M167 30 L162 62" fill="none" stroke-width="1.6"/></g></svg>';
    return s;
  }
  function drawWheel() { $('wheel').innerHTML = wheelSvg(); }
  function lights(mode) { var w = $('wheel'); w.className = 'wheel' + (mode ? ' ' + mode : ''); }
  // the angle (clockwise from the top, in the wheel's own frame) inside one slice of this prize
  function targetAngle(k) {
    var opts = [], j; for (j = 0; j < SL.length; j++) if (SL[j].k === k) opts.push(SL[j]);
    var x = opts[Math.floor(Math.random() * opts.length)], w = x.a1 - x.a0;   // only where the bowl stops: the prize is already drawn
    return x.a0 + w * (0.25 + Math.random() * 0.5);
  }
  function sliceAt(rot) { var a = ((-rot % 360) + 360) % 360, j; for (j = 0; j < SL.length; j++) if (a >= SL[j].a0 && a < SL[j].a1) return j; return 0; }
  function angleOf(g) {   // the wheel's angle right now, mid-transition
    var m = window.getComputedStyle(g).transform, v = m && m.match(/matrix\(([^)]+)\)/);
    if (!v) return 0; var p = v[1].split(','); return Math.atan2(parseFloat(p[1]), parseFloat(p[0])) * 180 / Math.PI;
  }
  function wobble() { var w = $('whisk'); if (!w) return; w.classList.remove('wob'); w.getBoundingClientRect(); w.classList.add('wob'); }
  function turnTo(k, animate, then) {
    var theta = targetAngle(k), from = S.rot, need = ((360 - theta) - (from % 360) + 720) % 360;
    var to = from + (animate ? 360 * 5 : 0) + need;
    S.rot = to;
    var g = $('rot');
    if (!animate || reduce || !g) { drawWheel(); if (then) then(); return; }
    g.getBoundingClientRect();   // the start angle is laid out before the transition starts
    g.classList.add('go'); g.style.transform = 'rotate(' + to + 'deg)';
    lights('chase');
    var last = sliceAt(from), bulbs = document.querySelectorAll('#bulbs .bulb'), t0 = Date.now(), running = true;
    (function frame() {   // a tick + a whisk wobble each time a slice passes, lights running round
      if (!running) return;
      var cur = sliceAt(angleOf(g));
      if (cur !== last) { last = cur; tick(); wobble(); }
      var lead = Math.floor((Date.now() - t0) / 45) % BULBS, j;
      for (j = 0; j < bulbs.length; j++) bulbs[j].classList.toggle('on', ((lead - j + BULBS) % BULBS) < 3 || ((lead + 12 - j + BULBS) % BULBS) < 3);
      window.requestAnimationFrame(frame);
    })();
    var fired = false, fin = function () {
      if (fired) return; fired = true; running = false;
      for (var j = 0; j < bulbs.length; j++) bulbs[j].classList.remove('on');
      if (then) then();
    };
    g.addEventListener('transitionend', fin); setTimeout(fin, 5000);
  }

  // ---------- glitter (a canvas over the page; matcha green, gold and clay flecks + little stars) ----------
  var cv = null, ctx = null, parts = [], drawing = false;
  var COLORS = ['#F2B15C', '#F2B15C', '#7E9F45', '#A7C47F', '#24382C', '#BE6E4A', '#E9C46A'];
  function burst(x, y, n, spread) {
    if (reduce) return;
    if (!cv) { cv = document.createElement('canvas'); cv.className = 'glitter'; cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(cv); ctx = cv.getContext('2d'); }
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = window.innerWidth * dpr; cv.height = window.innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (var k = 0; k < n; k++) {
      var a = Math.random() * Math.PI * 2, sp = (spread || 9) * (0.35 + Math.random() * 0.75);
      parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4, r: 2 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        c: COLORS[Math.floor(Math.random() * COLORS.length)], s: Math.random() < 0.25 ? 2 : Math.random() < 0.5 ? 1 : 0, life: 70 + Math.random() * 60, age: 0 });
    }
    if (!drawing) { drawing = true; window.requestAnimationFrame(step); }
  }
  function star(r) { ctx.beginPath(); for (var k = 0; k < 8; k++) { var rr = k % 2 ? r * 0.4 : r * 1.6, a = k * Math.PI / 4; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
  function step() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(function (p) { return p.age < p.life; });
    for (var k = 0; k < parts.length; k++) {
      var p = parts[k]; p.age++; p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.22; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - p.age / p.life) * (p.s === 2 ? 0.6 + 0.4 * Math.sin(p.age / 3) : 1);
      ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
      if (p.s === 2) star(p.r); else if (p.s === 1) { ctx.beginPath(); ctx.arc(0, 0, p.r * 0.7, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9);
      ctx.restore();
    }
    if (parts.length) window.requestAnimationFrame(step); else { drawing = false; ctx.clearRect(0, 0, cv.width, cv.height); }
  }
  function centreOf(el) { var r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }

  // ---------- server ----------
  function post(path, body) {
    if (FAKE) return FAKE(path, body || {});
    return fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), cache: 'no-store' })
      .then(function (r) { return r.json().then(function (j) { j.httpStatus = r.status; return j; }, function () { return { ok: false, code: 'try-again', httpStatus: r.status }; }); });
  }
  function hello() {
    if (S.device) return Promise.resolve(S.device);
    return post('/hello').then(function (j) {
      if (!j.ok || !j.device) { var e = new Error(j.code || 'hello'); e.code = j.code; throw e; }
      S.device = j.device; store.set(KEY_DEV, j.device); return j.device;
    });
  }

  // ---------- words ----------
  var DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  function sgt(iso) {   // "fri 13 nov, 5pm" in Singapore time, whatever the phone's zone
    var d = new Date(Date.parse(iso) + 8 * 3600000), h = d.getUTCHours(), m = d.getUTCMinutes();
    var t = (h % 12 || 12) + (m ? ':' + (m < 10 ? '0' : '') + m : '') + (h < 12 ? 'am' : 'pm');
    return DAYS[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ', ' + t;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function msg(html) { $('msg').innerHTML = html || ''; }
  function setBtn(text, enabled) { var b = $('go'); b.textContent = text; b.disabled = !enabled; b.hidden = false; b.classList.toggle('pulse', !!enabled && !reduce); }
  var BUSY = 'lots of spins on this wi-fi. turn off wi-fi, then tap spin.';

  // ---------- the voucher ----------
  function qrSvg(text) {
    var qr = window.qrcode(0, 'M'); qr.addData(text); qr.make();
    var n = qr.getModuleCount(), q = 2, tot = n + 2 * q, d = '', r, c;
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (qr.isDark(r, c)) d += 'M' + (c + q) + ' ' + (r + q) + 'h1v1h-1z';
    return '<svg viewBox="0 0 ' + tot + ' ' + tot + '" shape-rendering="crispEdges" role="img" aria-label="voucher QR code"><rect width="' + tot + '" height="' + tot + '" fill="#fff"/><path fill="#24382C" d="' + d + '"/></svg>';
  }
  function showVoucher(v, fresh) {
    var p = P[v.prize]; if (!p) return;
    store.set(KEY_V, JSON.stringify(v));
    $('go').hidden = true; msg('');
    var el = $('voucher');
    el.innerHTML = '<img class="di" src="' + (window.SPIN_ICE || 'assets/img/iced-drink-cream.webp') + '" alt="">' +
      '<p class="t">gotcha!</p><p class="r' + (v.prize === 'one' ? ' n' : '') + '">' + esc(p.name) + '</p><p class="h">' + esc(p.how) + '</p>' +
      '<div class="qr">' + qrSvg(VOUCHER_URL + v.token) + '</div>' +
      '<p class="code" aria-label="voucher code">' + esc(v.code) + '</p>' +
      '<p class="shot">screenshot this now. it\'s your voucher.</p>' +
      '<p class="when">use at woodleigh or jurong point,<br><span class="n">sun 15 – sun 29 nov</span>. one per cup.</p>' +
      (FAKE ? '<p class="test">mock-up: not a real voucher</p><button class="again" type="button" id="again">spin again (mock-up only)</button>'
        : API === STAGING ? '<p class="test">test voucher, not valid</p>' : '');
    el.hidden = false; $('club').hidden = false;
    el.classList.remove('shine'); if (fresh && !reduce) { el.getBoundingClientRect(); el.classList.add('shine'); }
    $('status').textContent = 'you got ' + p.name + '. your voucher code is ' + v.code + '.';
    if (fresh && el.scrollIntoView) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  function celebrate(v) {   // lights flash, ding ding ding, glitter from the bowl; then the voucher slides into view with a second burst
    var big = !!P[v.prize].big;
    lights('flash'); ding(big);
    if (navigator.vibrate) try { navigator.vibrate(big ? [40, 60, 40, 60, 80] : [40, 60, 40]); } catch (e) { /* fine */ }
    var c = centreOf($('wheel')); burst(c[0], c[1], big ? 180 : 100, big ? 12 : 9);
    setTimeout(function () {
      showVoucher(v, true); lights('idle');
      setTimeout(function () { var r = $('voucher').getBoundingClientRect(); burst(r.left + r.width / 2, Math.max(40, r.top + 20), big ? 90 : 50, 7); }, 650);
    }, 1100);
  }

  // ---------- flow ----------
  function render(st) {
    S.gone = st.gone || []; S.status = st.status;
    drawWheel(); lights(st.status === 'open' && !st.mine ? 'idle' : '');
    var gl = $('gone');
    if (gl) gl.textContent = S.gone.length ? (S.gone.map(function (k) { return P[k].name.replace(/^a /, '') + 's'; }).join(' and ') + ': all gone for today.') : '';
    if (st.mine) { turnTo(st.mine.prize, false); showVoucher(st.mine, false); return; }
    $('voucher').hidden = true;
    clearTimeout(S.timer);
    if (st.status === 'open') { setBtn('spin', true); msg(''); }
    else if (st.status === 'later') {
      setBtn('spins open ' + (st.next ? sgt(st.next.opens) : 'soon'), false); msg('see you at the fran x gotcha matcha booth.');
      var wait = st.next ? Date.parse(st.next.opens) - Date.now() + 2000 : 0;   // a page left open turns on by itself at opening time
      if (wait > 0 && wait < 86400000) S.timer = setTimeout(load, wait);
    }
    else if (st.status === 'over') { setBtn('spins have closed', false); msg('that\'s a wrap. thanks for spinning!'); $('club').hidden = false; }
    else { setBtn('spins are closed', false); msg(''); }
  }
  function load() {
    setBtn('…', false); drawWheel();   // the wheel shows at once, even before the server answers on slow mall wi-fi
    var cached = store.get(KEY_V);
    if (cached) { try { var v = JSON.parse(cached); turnTo(v.prize, false); showVoucher(v, false); } catch (e) { cached = null; } }
    post('/state', S.device ? { device: S.device } : {}).then(function (st) {
      if (!st.ok) throw new Error(st.code || 'state');
      // the server's answer wins: a stored voucher it doesn't know for this phone (an old test, a copied value) is dropped.
      // Only with no phone id at all (can't ask) does a stored copy stay; offline (the catch below) it stays too.
      if (cached && !st.mine && S.device) { store.set(KEY_V, ''); $('voucher').hidden = true; $('voucher').innerHTML = ''; $('club').hidden = true; cached = null; S.rot = 0; }
      if (st.mine || !cached) render(st);
    }).catch(function () {
      if (cached) return;
      setBtn('spin', false);
      msg('can\'t reach us right now. <button type="button" id="retry">try again</button>');
    });
  }
  function spin() {
    if (S.busy) return; S.busy = true;
    audio(); tick();   // sound must start inside the tap
    setBtn('spinning…', false); msg(''); lights('');
    hello().then(function (device) { return post('/spin', { device: device }); }).then(function (j) {
      if (!j.ok && j.code === 'bad-device') {   // this phone's id is unknown (e.g. after a reset): get a new one once, then spin
        S.device = null; store.set(KEY_DEV, '');
        return hello().then(function (device) { return post('/spin', { device: device }); });
      }
      return j;
    }).then(function (j) {
      if (j.ok) {
        var v = { prize: j.prize, code: j.code, token: j.token, useFrom: j.useFrom, useBy: j.useBy };
        if (j.already) { turnTo(v.prize, false); showVoucher(v, true); S.busy = false; return; }
        $('status').textContent = 'spinning';
        turnTo(v.prize, true, function () { celebrate(v); S.busy = false; });
        return;
      }
      S.busy = false;
      if (j.code === 'later' || j.code === 'over' || j.code === 'stopped') { render({ status: j.code, next: j.next, gone: S.gone }); return; }
      setBtn('spin', true);
      if (j.code === 'busy') { msg(BUSY); return; }
      msg('that didn\'t work. <button type="button" id="retry2">try again</button>');
    }).catch(function (e) {
      S.busy = false; setBtn('spin', true);
      msg(e && e.code === 'busy' ? BUSY : 'can\'t reach us. check your connection and try again.');
    });
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.id === 'go') spin();
    else if (t.id === 'retry') load();
    else if (t.id === 'retry2') spin();
    else if (t.id === 'snd') setSound(!soundOn);
    else if (t.id === 'again') { $('voucher').hidden = true; $('club').hidden = true; setBtn('spin', true); lights('idle'); window.scrollTo(0, 0); }
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S.status === 'later' && !S.busy) load(); });
  document.documentElement.className = document.documentElement.className.replace('no-js', 'js');
  if (!window.fetch && !FAKE) { msg('please update your browser to spin.'); return; }
  if (!window.qrcode) { msg('please update your browser to spin.'); return; }
  setSound(soundOn, true);
  load();
})();
