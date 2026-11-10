/* Fran X Gotcha matcha spin (gotcha-hq DECISIONS 11 Nov 2026). The SERVER draws every prize and keeps one spin per phone; this page
   only turns the wheel to what the server answered and shows the voucher. Phone id: made by the server, kept on this phone, sent in
   request bodies only. Plain ES5-style code (old phones). */
(function () {
  'use strict';
  var LIVE = 'https://gotcha-spin.long-fog-ae60.workers.dev', STAGING = 'https://gotcha-spin-staging.long-fog-ae60.workers.dev';
  var API = (location.protocol === 'file:' || /(^|[?&])api=staging(&|$)/.test(location.search)) ? STAGING : LIVE;
  var VOUCHER_URL = 'https://gotchamatcha2025.github.io/spin/v/#';   // what the voucher QR opens (the staff scan, from 15 Nov)
  var KEY_DEV = 'gm-spin-device', KEY_V = 'gm-spin-voucher';

  // the prizes, in the wheel's words. per = chance per 1,000 spins (the server's numbers; shown in the footer and on the rules page)
  var P = {
    foam: { name: 'free cold foam', how: 'added to any drink you buy', label: 'cold foam', fill: '#FFFFFF' },
    up:   { name: 'free upsize',    how: 'on any drink you buy',       label: 'upsize',    fill: '#DCE8D2' },
    one:  { name: '1-for-1',        how: 'buy one drink, get one free', label: '1-for-1',  fill: '#F2B15C', alt: true },
    free: { name: 'a free drink',   how: 'any drink, regular size',     label: 'free drink', fill: '#24382C', inv: true }
  };
  // slices clockwise from the top, sized to the real chance: cold foam 60% = 4 × 54°, upsize 20% = 2 × 36°, 1-for-1 15% = 2 × 27°,
  // free drink 5% = 18°
  var ORDER = [['foam', 54], ['up', 36], ['foam', 54], ['one', 27], ['free', 18], ['foam', 54], ['up', 36], ['foam', 54], ['one', 27]];
  var SL = [], a0 = 0;
  for (var i = 0; i < ORDER.length; i++) { SL.push({ k: ORDER[i][0], a0: a0, a1: a0 + ORDER[i][1] }); a0 += ORDER[i][1]; }

  var $ = function (id) { return document.getElementById(id); };
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* private mode: works for this visit only */ } }
  };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var S = { device: store.get(KEY_DEV), rot: 0, gone: [], busy: false };

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
      '<circle cx="160" cy="196" r="152" fill="#fff" stroke="#24382C" stroke-width="3.2"/>' +
      '<g class="rot" id="rot" style="transform:rotate(' + S.rot + 'deg)">';
    var labels = '';
    for (var i = 0; i < SL.length; i++) {
      var x = SL[i], p = P[x.k], gone = S.gone.indexOf(x.k) >= 0, mid = (x.a0 + x.a1) / 2;
      s += '<path d="' + arc(x.a0, x.a1) + '" fill="' + (gone ? 'url(#hatch)' : p.fill) + '" stroke="#24382C" stroke-width="2" stroke-linejoin="round"/>';
      var q = pt(R * 0.6, mid), ang = mid - 90 + (mid > 180 ? 180 : 0);
      labels += '<text class="wl' + (p.alt ? ' alt' : '') + (p.inv && !gone ? ' inv' : '') + '" x="' + q[0].toFixed(1) + '" y="' + q[1].toFixed(1) +
        '" text-anchor="middle" dominant-baseline="middle" transform="rotate(' + ang.toFixed(1) + ' ' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')">' + p.label + '</text>';
      if (x.k === 'free') {
        var st = pt(R - 12, mid);
        labels += '<path transform="translate(' + st[0].toFixed(1) + ' ' + st[1].toFixed(1) + ')" d="M0-8 2.4-2.5 8.2-2.5 3.5 1 5.3 6.8 0 3.3-5.3 6.8-3.5 1-8.2-2.5-2.4-2.5Z" fill="#F2B15C" stroke="#24382C" stroke-width="1.4" stroke-linejoin="round"/>';
      }
    }
    s += labels + '</g>' +
      '<circle cx="160" cy="196" r="138" fill="none" stroke="#24382C" stroke-width="3.2"/>' +
      '<circle cx="160" cy="196" r="30" fill="#fff" stroke="#24382C" stroke-width="3"/>' +
      '<image href="assets/img/logo-hand.svg" x="148" y="178" width="24" height="35"/>' +
      '<g stroke="#24382C" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">' +
      '<rect x="153" y="0" width="14" height="26" rx="5" fill="#D8C2A8"/>' +
      '<path d="M146 26 H174 C176 40 170 56 160 70 C150 56 144 40 146 26Z" fill="#fff"/>' +
      '<path d="M153 30 L158 62 M160 30 V67 M167 30 L162 62" fill="none" stroke-width="1.6"/></g></svg>';
    return s;
  }
  function drawWheel() { $('wheel').innerHTML = wheelSvg(); }
  // the angle (clockwise from the top, in the wheel's own frame) inside one slice of this prize
  function targetAngle(k) {
    var opts = [], i; for (i = 0; i < SL.length; i++) if (SL[i].k === k) opts.push(SL[i]);
    var x = opts[Math.floor(Math.random() * opts.length)], w = x.a1 - x.a0;   // only where the bowl stops: the prize is already drawn
    return x.a0 + w * (0.25 + Math.random() * 0.5);
  }
  function turnTo(k, animate, then) {
    var theta = targetAngle(k), from = S.rot, need = ((360 - theta) - (from % 360) + 720) % 360;
    var to = from + (animate ? 360 * 5 : 0) + need;
    S.rot = to;
    var g = $('rot');
    if (!animate || reduce || !g) { drawWheel(); if (then) then(); return; }
    g.getBoundingClientRect();   // the start angle is laid out before the transition starts
    g.classList.add('go'); g.style.transform = 'rotate(' + to + 'deg)';
    var fired = false, fin = function () { if (fired) return; fired = true; if (then) then(); };
    g.addEventListener('transitionend', fin); setTimeout(fin, 5000);
  }

  // ---------- server ----------
  function post(path, body) {
    return fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), cache: 'no-store' })
      .then(function (r) { return r.json().then(function (j) { j.httpStatus = r.status; return j; }, function () { return { ok: false, code: 'try-again', httpStatus: r.status }; }); });
  }
  function hello() {
    if (S.device) return Promise.resolve(S.device);
    return post('/hello').then(function (j) {
      if (!j.ok || !j.device) throw new Error(j.code || 'hello');
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
  function setBtn(text, enabled) { var b = $('go'); b.textContent = text; b.disabled = !enabled; b.hidden = false; }

  // ---------- the voucher ----------
  function qrSvg(text) {
    var qr = window.qrcode(0, 'M'); qr.addData(text); qr.make();
    var n = qr.getModuleCount(), q = 2, tot = n + 2 * q, d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) d += 'M' + (c + q) + ' ' + (r + q) + 'h1v1h-1z';
    return '<svg viewBox="0 0 ' + tot + ' ' + tot + '" shape-rendering="crispEdges" role="img" aria-label="voucher QR code"><rect width="' + tot + '" height="' + tot + '" fill="#fff"/><path fill="#24382C" d="' + d + '"/></svg>';
  }
  function showVoucher(v, scroll) {
    var p = P[v.prize]; if (!p) return;
    store.set(KEY_V, JSON.stringify(v));
    $('go').hidden = true; msg('');
    var el = $('voucher');
    el.innerHTML = '<img class="di" src="assets/img/iced-drink-cream.webp" alt="">' +
      '<p class="t">gotcha!</p><p class="r">' + esc(p.name) + '</p><p class="h">' + esc(p.how) + '</p>' +
      '<div class="qr">' + qrSvg(VOUCHER_URL + v.token) + '</div>' +
      '<p class="code" aria-label="voucher code">' + esc(v.code) + '</p>' +
      '<p class="shot">screenshot this. it\'s your voucher.</p>' +
      '<p class="when">use at woodleigh or jurong point,<br><span class="n">sun 15 – sun 29 nov</span>. one per cup.</p>';
    el.hidden = false; $('club').hidden = false;
    $('status').textContent = 'you got ' + p.name + '. your voucher code is ' + v.code + '.';
    if (scroll && el.scrollIntoView) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  // ---------- flow ----------
  function render(st) {
    S.gone = st.gone || [];
    drawWheel();
    var gl = $('gone');
    if (gl) gl.textContent = S.gone.length ? (S.gone.map(function (k) { return P[k].name.replace(/^a /, '') + 's'; }).join(' and ') + ': all gone for today.') : '';
    if (st.mine) { turnTo(st.mine.prize, false); showVoucher(st.mine, false); return; }
    $('voucher').hidden = true;
    if (st.status === 'open') { setBtn('spin', true); msg(''); }
    else if (st.status === 'later') { setBtn('spins open ' + (st.next ? sgt(st.next.opens) : 'soon'), false); msg('see you at the fran x gotcha matcha booth.'); }
    else if (st.status === 'over') { setBtn('spins have closed', false); msg('that\'s a wrap. thanks for spinning!'); $('club').hidden = false; }
    else { setBtn('spins are closed', false); msg(''); }
  }
  function load() {
    setBtn('…', false);
    var cached = store.get(KEY_V);
    if (cached) { try { var v = JSON.parse(cached); drawWheel(); turnTo(v.prize, false); showVoucher(v, false); } catch (e) { /* ignore a broken copy */ } }
    post('/state', S.device ? { device: S.device } : {}).then(function (st) {
      if (!st.ok) throw new Error(st.code || 'state');
      if (S.device && !st.mine && cached) { /* this phone's voucher is kept above; the server copy wins once it answers */ }
      if (st.mine || !cached) render(st);
    }).catch(function () {
      if (cached) return;
      drawWheel(); setBtn('spin', false);
      msg('can\'t reach us right now. <button type="button" id="retry">try again</button>');
    });
  }
  function spin() {
    if (S.busy) return; S.busy = true;
    setBtn('spinning…', false); msg('');
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
        turnTo(v.prize, true, function () { showVoucher(v, true); S.busy = false; });
        return;
      }
      S.busy = false;
      if (j.code === 'later' || j.code === 'over' || j.code === 'stopped') { render({ status: j.code, next: j.next, gone: S.gone }); return; }
      if (j.code === 'busy') { setBtn('spin', true); msg('lots of spins on this wi-fi. try again in a minute.'); return; }
      setBtn('spin', true); msg('that didn\'t work. <button type="button" id="retry2">try again</button>');
    }).catch(function () {
      S.busy = false; setBtn('spin', true); msg('can\'t reach us. check your connection and try again.');
    });
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.id === 'go') spin();
    else if (t.id === 'retry') load();
    else if (t.id === 'retry2') spin();
  });
  document.documentElement.className = document.documentElement.className.replace('no-js', 'js');
  if (!window.fetch || !window.qrcode) { msg('please update your browser to spin.'); return; }
  load();
})();
