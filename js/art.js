// Entr0pic Noise — deterministic generative artwork from a uint256 seed.
// Same code runs in Node (API) and the browser (preview).
(function (root) {
  'use strict';

  // ---------- PRNG ----------
  function sfc32(a, b, c, d) {
    return function () {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      let t = (a + b) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      d = (d + 1) | 0;
      t = (t + d) | 0;
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
  }
  function rngFrom(seedHex) {
    let h = String(seedHex).replace(/^0x/, '').padStart(64, '0').slice(-64);
    const p = [0, 1, 2, 3].map((i) => parseInt(h.slice(i * 8, i * 8 + 8), 16) ^ parseInt(h.slice(32 + i * 8, 40 + i * 8), 16));
    const r = sfc32(p[0], p[1], p[2], p[3]);
    for (let i = 0; i < 24; i++) r();
    return r;
  }

  // ---------- Noise (2D simplex) ----------
  function makeNoise(rand) {
    const perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const g = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
    const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
    function n2(x, y) {
      const s = (x + y) * F2; const i = Math.floor(x + s), j = Math.floor(y + s);
      const t = (i + j) * G2; const x0 = x - (i - t), y0 = y - (j - t);
      const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
      const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      const ii = i & 255, jj = j & 255;
      let n = 0, tt;
      tt = 0.5 - x0 * x0 - y0 * y0; if (tt > 0) { const q = g[perm[ii + perm[jj]] & 7]; tt *= tt; n += tt * tt * (q[0] * x0 + q[1] * y0); }
      tt = 0.5 - x1 * x1 - y1 * y1; if (tt > 0) { const q = g[perm[ii + i1 + perm[jj + j1]] & 7]; tt *= tt; n += tt * tt * (q[0] * x1 + q[1] * y1); }
      tt = 0.5 - x2 * x2 - y2 * y2; if (tt > 0) { const q = g[perm[ii + 1 + perm[jj + 1]] & 7]; tt *= tt; n += tt * tt * (q[0] * x2 + q[1] * y2); }
      return 70 * n;
    }
    return function fbm(x, y, oct) {
      let a = 1, f = 1, s = 0, m = 0;
      for (let o = 0; o < (oct || 3); o++) { s += a * n2(x * f, y * f); m += a; a *= 0.5; f *= 2.03; }
      return s / m;
    };
  }

  // ---------- Curated palettes ----------
  const PALETTES = [
    { name: 'Bone', w: 16, bg: '#ECE6DA', ink: '#151413', acc: '#E5481F', mid: '#B9B1A2' },
    { name: 'Obsidian', w: 14, bg: '#0C0C0E', ink: '#E8E2D4', acc: '#C6F432', mid: '#3A3A3D' },
    { name: 'Cobalt', w: 12, bg: '#F1EEE6', ink: '#1A2FD0', acc: '#FF5B1F', mid: '#A9B1E6' },
    { name: 'Ash', w: 12, bg: '#262626', ink: '#D8D2C4', acc: '#FF3B2F', mid: '#555350' },
    { name: 'Moss', w: 10, bg: '#E4E0D0', ink: '#1F3529', acc: '#D7A31E', mid: '#9AA594' },
    { name: 'Ultraviolet', w: 9, bg: '#0B0A19', ink: '#B9A8FF', acc: '#FF4FA0', mid: '#2C2650' },
    { name: 'Dune', w: 9, bg: '#D7C9AE', ink: '#2A1D15', acc: '#2D5BFF', mid: '#A8977A' },
    { name: 'Vermilion', w: 6, bg: '#C42619', ink: '#F3ECE0', acc: '#111111', mid: '#8E1B12' },
    { name: 'Ice', w: 6, bg: '#E9EEF0', ink: '#0F2733', acc: '#00B3A4', mid: '#AFC0C7' },
    { name: 'Void', w: 4, bg: '#000000', ink: '#FFFFFF', acc: '#FFFFFF', mid: '#2B2B2B' },
    { name: 'Paper', w: 2, bg: '#F6F4EF', ink: '#0A0A0A', acc: '#0A0A0A', mid: '#CFCAC0' },
  ];
  const FORMS = [
    { name: 'Signal', w: 34 },
    { name: 'Flow', w: 28 },
    { name: 'Orbit', w: 22 },
    { name: 'Fracture', w: 16 },
  ];
  function pick(rand, arr) {
    const t = arr.reduce((s, x) => s + x.w, 0); let r = rand() * t;
    for (const x of arr) { r -= x.w; if (r <= 0) return x; }
    return arr[arr.length - 1];
  }
  const f1 = (n) => Math.round(n * 10) / 10;
  let UID = 0, PFX = 'x';

  function traits(seedHex) {
    const rand = rngFrom(seedHex);
    const palette = pick(rand, PALETTES);
    const form = pick(rand, FORMS);
    const e = Math.pow(rand(), 0.85);
    const entropy = Math.round((0.12 + e * 0.88) * 100) / 100;
    const state = entropy < 0.35 ? 'Calm' : entropy < 0.6 ? 'Drift' : entropy < 0.85 ? 'Storm' : 'Chaos';
    const density = rand();
    const dens = density < 0.33 ? 'Sparse' : density < 0.8 ? 'Dense' : 'Saturated';
    return { rand, palette, form, entropy, state, density, dens };
  }

  // ---------- Forms ----------
  function signal(t, N, S) {
    const { rand, palette: P, entropy: E, density } = t;
    const lines = Math.round(38 + density * 52);
    const amp = S * (0.05 + E * 0.17);
    const m = S * 0.14, bot = S * 0.87, top = Math.max(S * 0.2, 110 + amp * (1.4 + E) * 0.82);
    const cx = S * (0.35 + rand() * 0.3), w = S * (0.12 + rand() * 0.16);
    const fx = 0.004 + E * 0.012, fy = 0.08 + rand() * 0.15;
    const accIdx = new Set(); const nAcc = rand() < 0.5 ? 1 : rand() < 0.7 ? 2 : 0;
    for (let k = 0; k < nAcc; k++) accIdx.add(Math.floor(lines * (0.25 + rand() * 0.6)));
    const steps = 110; let out = '';
    const sw = f1(Math.max(1.1, 2.6 - density * 1.3));
    for (let i = 0; i < lines; i++) {
      const y0 = top + (bot - top) * (i / (lines - 1));
      let d = '';
      for (let s = 0; s <= steps; s++) {
        const x = m + (S - 2 * m) * (s / steps);
        const env = Math.exp(-Math.pow((x - cx) / w, 2));
        const n = (N(x * fx, i * fy, 4) + 1) / 2;
        const spike = Math.pow(n, 1.6 + (1 - E) * 2);
        const y = y0 - env * amp * spike * (1.4 + E) - env * 2;
        d += (s ? 'L' : 'M') + f1(x) + ' ' + f1(y);
      }
      const col = accIdx.has(i) ? P.acc : P.ink;
      out += `<path d="${d}L${f1(S - m)} ${f1(y0 + 40)}L${f1(m)} ${f1(y0 + 40)}Z" fill="${P.bg}" stroke="none"/>`;
      out += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${accIdx.has(i) ? sw * 1.6 : sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    return out;
  }

  function flow(t, N, S) {
    const { rand, palette: P, entropy: E, density } = t;
    const m = S * 0.1; const n = Math.round(220 + density * 380);
    const sc = 0.0016 + E * 0.0034; const turn = 2 + E * 6;
    const rot = rand() * Math.PI * 2;
    let out = '';
    const clip = (x, y) => x > m && x < S - m && y > m && y < S - m;
    for (let i = 0; i < n; i++) {
      let x = m + rand() * (S - 2 * m), y = m + rand() * (S - 2 * m);
      const len = 30 + Math.floor(rand() * (60 + 120 * (1 - density)));
      const r = rand();
      const col = r < 0.06 ? P.acc : r < 0.24 ? P.mid : P.ink;
      const w = f1(0.6 + Math.pow(rand(), 3) * (5 - density * 2.5));
      let d = 'M' + f1(x) + ' ' + f1(y), k = 0;
      for (; k < len; k++) {
        const a = rot + N(x * sc, y * sc, 3) * turn;
        x += Math.cos(a) * 4; y += Math.sin(a) * 4;
        if (!clip(x, y)) break;
        d += 'L' + f1(x) + ' ' + f1(y);
      }
      if (k > 4) out += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-opacity="${col === P.mid ? 0.9 : 1}"/>`;
    }
    return out;
  }

  function orbit(t, N, S) {
    const { rand, palette: P, entropy: E, density } = t;
    const cx = S * (0.42 + rand() * 0.16), cy = S * (0.44 + rand() * 0.14);
    const rings = Math.round(26 + density * 44); const maxR = S * 0.37 / (1 + (0.02 + E * 0.22) * 1.3);
    const accRing = Math.floor(rings * (0.3 + rand() * 0.6));
    const sc = 0.9 + E * 2.4; const amp = 0.02 + E * 0.22;
    let out = '';
    const sw = f1(Math.max(1, 2.4 - density * 1.2));
    for (let i = 0; i < rings; i++) {
      const r0 = maxR * (0.08 + 0.92 * (i / (rings - 1)));
      const pts = 160; let d = '';
      for (let s = 0; s <= pts; s++) {
        const a = (s / pts) * Math.PI * 2;
        const nx = Math.cos(a) * sc + i * 0.035, ny = Math.sin(a) * sc;
        const r = r0 * (1 + N(nx, ny + i * 0.05, 3) * amp * (0.4 + i / rings));
        d += (s ? 'L' : 'M') + f1(cx + Math.cos(a) * r) + ' ' + f1(cy + Math.sin(a) * r);
      }
      const isA = i === accRing;
      out += `<path d="${d}Z" fill="none" stroke="${isA ? P.acc : P.ink}" stroke-width="${isA ? sw * 2 : sw}" stroke-linejoin="round"/>`;
    }
    out += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(S * 0.012)}" fill="${P.acc}"/>`;
    return out;
  }

  function fracture(t, N, S) {
    const { rand, palette: P, entropy: E, density } = t;
    const m = S * 0.12; const rects = [];
    const maxDepth = 3 + Math.round(E * 4);
    (function split(x, y, w, h, d) {
      const stop = d >= maxDepth || (d > 1 && rand() < 0.22 - E * 0.15) || w < 34 || h < 34;
      if (stop) { rects.push([x, y, w, h, d]); return; }
      const vert = w > h ? rand() < 0.75 : rand() < 0.25;
      const r = 0.25 + rand() * 0.5;
      if (vert) { split(x, y, w * r, h, d + 1); split(x + w * r, y, w * (1 - r), h, d + 1); }
      else { split(x, y, w, h * r, d + 1); split(x, y + h * r, w, h * (1 - r), d + 1); }
    })(m, m, S - 2 * m, S - 2 * m, 0);
    let out = ''; const gap = 3;
    let accLeft = 1 + Math.floor(rand() * 2);
    rects.forEach(([x, y, w, h], idx) => {
      const r = rand();
      const jx = (N(x * 0.01, y * 0.01) * E) * 18, jy = (N(y * 0.01, x * 0.01) * E) * 18;
      const X = x + gap + jx, Y = y + gap + jy, W = Math.max(4, w - gap * 2), H = Math.max(4, h - gap * 2);
      if (accLeft > 0 && r < 0.1 && W * H > 3000) { accLeft--; out += `<rect x="${f1(X)}" y="${f1(Y)}" width="${f1(W)}" height="${f1(H)}" fill="${P.acc}"/>`; return; }
      if (r < 0.32) { out += `<rect x="${f1(X)}" y="${f1(Y)}" width="${f1(W)}" height="${f1(H)}" fill="${P.ink}"/>`; return; }
      if (r < 0.75) {
        const ang = rand() < 0.4 ? 0 : rand() < 0.5 ? 90 : 45;
        const step = 5 + Math.floor(rand() * 6 * (1.2 - density));
        let d = '';
        if (ang === 0) for (let yy = Y + step / 2; yy < Y + H; yy += step) d += `M${f1(X)} ${f1(yy)}H${f1(X + W)}`;
        else if (ang === 90) for (let xx = X + step / 2; xx < X + W; xx += step) d += `M${f1(xx)} ${f1(Y)}V${f1(Y + H)}`;
        else for (let k = -H; k < W; k += step * 1.4) d += `M${f1(X + k)} ${f1(Y + H)}L${f1(X + k + H)} ${f1(Y)}`;
        out += `<clipPath id="${PFX}c${idx}"><rect x="${f1(X)}" y="${f1(Y)}" width="${f1(W)}" height="${f1(H)}"/></clipPath>`;
        out += `<path d="${d}" stroke="${P.ink}" stroke-width="1.3" fill="none" clip-path="url(#${PFX}c${idx})"/>`;
        out += `<rect x="${f1(X)}" y="${f1(Y)}" width="${f1(W)}" height="${f1(H)}" fill="none" stroke="${P.ink}" stroke-width="1.3"/>`;
        return;
      }
      out += `<rect x="${f1(X)}" y="${f1(Y)}" width="${f1(W)}" height="${f1(H)}" fill="none" stroke="${P.ink}" stroke-width="1.2"/>`;
    });
    return out;
  }

  // ---------- Compose ----------
  function render(seedHex, tokenId, opts) {
    opts = opts || {};
    const S = 1000;
    PFX = 'n' + (UID++).toString(36) + 'z';
    const t = traits(seedHex);
    const N = makeNoise(t.rand);
    const P = t.palette;
    const body = ({ Signal: signal, Flow: flow, Orbit: orbit, Fracture: fracture })[t.form.name](t, N, S);
    const id = tokenId == null ? '????' : String(tokenId).padStart(4, '0');
    const dark = parseInt(P.bg.slice(1, 3), 16) < 90;
    const grainOp = dark ? 0.16 : 0.22;
    const label = opts.noLabel ? '' :
      `<g font-family="Space Mono, ui-monospace, monospace" font-size="15" letter-spacing="2.2" fill="${P.ink}" fill-opacity="0.78">` +
      `<text x="70" y="62">ENTR0PIC NOISE</text>` +
      `<text x="930" y="62" text-anchor="end">N\u00BA ${id}/3333</text>` +
      `<text x="70" y="948">${t.form.name.toUpperCase()} \u00B7 ${P.name.toUpperCase()}</text>` +
      `<text x="930" y="948" text-anchor="end">H = ${t.entropy.toFixed(2)}</text></g>` +
      `<path d="M70 76H930M70 924H930" stroke="${P.ink}" stroke-opacity="0.22" stroke-width="1"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">` +
      `<defs><filter id="${PFX}g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${Math.floor(t.rand() * 999)}" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 ${dark ? 1 : 0} 0 0 0 0 ${dark ? 1 : 0} 0 0 0 0 ${dark ? 1 : 0} 0 0 0 ${grainOp} 0"/></filter>` +
      `<radialGradient id="${PFX}v" cx="50%" cy="46%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="${dark ? 0.45 : 0.12}"/></radialGradient></defs>` +
      `<rect width="${S}" height="${S}" fill="${P.bg}"/>` + body + label +
      `<rect width="${S}" height="${S}" fill="url(#${PFX}v)"/>` + (opts.noGrain ? '' : `<rect width="${S}" height="${S}" filter="url(#${PFX}g)"/>`) + '</svg>';
    return { svg, traits: { Form: t.form.name, Palette: P.name, Entropy: t.entropy.toFixed(2), State: t.state, Density: t.dens } };
  }

  const api = { render, PALETTES, FORMS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Entr0pic = api;
})(typeof self !== 'undefined' ? self : this);
