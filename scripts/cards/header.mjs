import { document_, esc, rect, text } from '../lib/svg.mjs';
import { SANS, SERIF, fontFaces, measure } from '../lib/fonts.mjs';
import { ICONS } from '../lib/icons.mjs';

// Intro card: a moving ticker strip, photo, name, the one-line pitch with the
// accent word in serif, availability, and the stack. Matches the portfolio and
// the social banners.
export function header(t, data, cfg) {
  const W = cfg.cards.width;
  const H = 304;
  const X = 196; // text column
  const sans = (str, o) => text(str, { family: SANS, ...o });

  // --- Ticker: one sequence of messages and stars, repeated to fill the strip.
  // The group slides left by exactly one sequence, so the loop is seamless.
  const TICK = { face: 'sans700', size: 11.5, letterSpacing: 1.9 };
  const GAP = 22;
  const STAR = 9;
  let cursor = 0;
  const seq = [];
  for (const item of cfg.ticker) {
    const label = item.toUpperCase();
    seq.push({ kind: 'text', label, x: cursor });
    cursor += measure(label, TICK) + GAP;
    seq.push({ kind: 'star', x: cursor });
    cursor += STAR + GAP;
  }
  const period = Math.round(cursor);
  const copies = Math.ceil(W / period) + 1;
  const tickerItems = Array.from({ length: copies }, (_, c) =>
    seq
      .map((s) => {
        const x = (s.x + c * period + 24).toFixed(1);
        return s.kind === 'text'
          ? sans(s.label, { x, y: 22, size: TICK.size, weight: 700, fill: t.onAccent, letterSpacing: TICK.letterSpacing })
          : `<path transform="translate(${x} 13.5)" d="M4.5 0 L5.6 3.4 L9 4.5 L5.6 5.6 L4.5 9 L3.4 5.6 L0 4.5 L3.4 3.4 Z" fill="#141414"/>`;
      })
      .join(''),
  ).join('');

  // --- Headline: plain words, the accent word in serif with a hand-drawn underline, plain words.
  const HL = { size: 21, y: 170 };
  const before = cfg.headline.before + ' ';
  const wBefore = measure(before, { face: 'sans500', size: HL.size });
  const wAccent = measure(cfg.headline.accent, { face: 'serif', size: 27 });
  const xAccent = X + wBefore;
  const xAfter = xAccent + wAccent + 6;
  const underline = `<path d="M${(xAccent - 2).toFixed(1)} ${HL.y + 7} C ${(xAccent + wAccent * 0.25).toFixed(1)} ${HL.y + 3}, ${(xAccent + wAccent * 0.6).toFixed(1)} ${HL.y + 2}, ${(xAccent + wAccent + 3).toFixed(1)} ${HL.y + 5}" fill="none" stroke="${t.accent}" stroke-width="2.4" stroke-linecap="round" opacity="0.9"/>`;

  // --- Status pill.
  const pillW = measure(cfg.status, { face: 'sans500', size: 13 }) + 40;
  const pillY = 192;
  const pill = `
    ${rect({ x: X, y: pillY, w: pillW, h: 30, r: 3, fill: t.name === 'light' ? '#141414' : t.text })}
    <circle cx="${X + 15}" cy="${pillY + 15}" r="4" fill="#22C55E"><animate attributeName="opacity" values="1;0.35;1" dur="2.4s" repeatCount="indefinite"/></circle>
    ${sans(cfg.status, { x: X + 27, y: pillY + 19.5, size: 13, weight: 500, fill: t.name === 'light' ? '#FFFFFF' : '#141414' })}
    ${sans(`${cfg.location} · working with teams worldwide`, { x: X + pillW + 14, y: pillY + 19.5, size: 13, weight: 500, fill: t.muted })}`;

  // --- Stack row: monochrome marks, Bubble as a wordmark.
  const rowY = 262;
  let sx = 104;
  const marks = cfg.stack
    .map((slug) => {
      if (slug === 'bubble') {
        const out = `${sans('bubble', { x: sx, y: rowY + 14, size: 16, weight: 700, fill: t.muted, letterSpacing: -0.6 })}<circle cx="${(sx + measure('bubble', { face: 'sans700', size: 16, letterSpacing: -0.6 }) + 2).toFixed(1)}" cy="${rowY + 12.5}" r="1.8" fill="${t.accent}"/>`;
        sx += measure('bubble', { face: 'sans700', size: 16 }) + 22;
        return out;
      }
      const icon = ICONS[slug];
      if (!icon) return '';
      const out = `<g transform="translate(${sx} ${rowY}) scale(0.75)" fill="${t.muted}"><title>${esc(icon.title)}</title><path d="${icon.path}"/></g>`;
      sx += 18 + 18;
      return out;
    })
    .join('');

  const host = cfg.portfolio.replace(/^https?:\/\//, '');
  const avatar = data.avatarDataUri
    ? `<image href="${data.avatarDataUri}" x="44" y="88" width="112" height="112" clip-path="url(#av)" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle cx="100" cy="144" r="56" fill="${t.chipFill}"/>`;

  const body = `
  <style>${fontFaces(['sans500', 'sans700', 'serif'])}
    .tk{animation:tk ${(period / 38).toFixed(1)}s linear infinite}
    @keyframes tk{to{transform:translateX(-${period}px)}}
    @media (prefers-reduced-motion:reduce){.tk{animation:none}}
  </style>
  <defs>
    <clipPath id="card"><rect width="${W}" height="${H}" rx="18"/></clipPath>
    <clipPath id="av"><circle cx="100" cy="144" r="56"/></clipPath>
    <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.05" fill="${t.dots}" opacity="${t.dotsOpacity}"/></pattern>
    <radialGradient id="fade" cx="0.42" cy="0.55" r="0.6"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <mask id="dotmask"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${t.accent}" stop-opacity="${t.glow}"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></radialGradient>
  </defs>
  <g clip-path="url(#card)">
    ${rect({ x: 0, y: 0, w: W, h: H, fill: t.bg })}
    <rect width="${W}" height="${H}" fill="url(#dots)" mask="url(#dotmask)"/>
    <ellipse cx="${W * 0.55}" cy="-30" rx="380" ry="190" fill="url(#glow)"/>

    ${rect({ x: 0, y: 0, w: W, h: 34, fill: t.accent })}
    <line x1="0" y1="5.5" x2="${W}" y2="5.5" stroke="#fff" stroke-opacity="0.45" stroke-dasharray="3 3"/>
    <line x1="0" y1="28.5" x2="${W}" y2="28.5" stroke="#fff" stroke-opacity="0.45" stroke-dasharray="3 3"/>
    <g class="tk">${tickerItems}</g>

    <circle cx="100" cy="144" r="61" fill="none" stroke="${t.accent}" stroke-width="2"/>
    <circle cx="100" cy="144" r="58" fill="${t.bg}"/>
    ${avatar}

    ${sans(cfg.title.toUpperCase(), { x: X, y: 88, size: 11.5, weight: 700, fill: t.muted, letterSpacing: 1.8 })}
    ${sans('@' + cfg.login, { x: W - 30, y: 88, size: 12.5, weight: 500, fill: t.muted, anchor: 'end' })}
    ${sans(cfg.name, { x: X, y: 130, size: 36, weight: 700, fill: t.text, letterSpacing: -1.1 })}

    ${sans(before.trim(), { x: X, y: HL.y, size: HL.size, weight: 500, fill: t.textDim, letterSpacing: -0.2 })}
    ${text(cfg.headline.accent, { x: xAccent.toFixed(1), y: HL.y + 1, size: 27, weight: 400, family: SERIF, fill: t.accent, extra: 'font-style="italic"' })}
    ${underline}
    ${sans(cfg.headline.after, { x: xAfter.toFixed(1), y: HL.y, size: HL.size, weight: 500, fill: t.textDim, letterSpacing: -0.2 })}

    ${pill}

    <line x1="30" y1="244" x2="${W - 30}" y2="244" stroke="${t.stroke}"/>
    ${sans('STACK', { x: 30, y: rowY + 13, size: 10.5, weight: 700, fill: t.muted, letterSpacing: 1.6 })}
    <line x1="76" y1="${rowY + 9}" x2="92" y2="${rowY + 9}" stroke="${t.muted}" stroke-opacity="0.5"/>
    ${marks}
    ${sans(host + ' →', { x: W - 30, y: rowY + 13, size: 13, weight: 700, fill: t.accent, anchor: 'end' })}
  </g>
  ${rect({ x: 0.5, y: 0.5, w: W - 1, h: H - 1, r: 18, stroke: t.stroke })}`;

  return document_({ w: W, h: H, body, title: `${cfg.name}, ${cfg.title}. ${cfg.headline.before} ${cfg.headline.accent} ${cfg.headline.after}` });
}
