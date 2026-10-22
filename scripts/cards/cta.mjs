import { document_, rect, text } from '../lib/svg.mjs';
import { SANS, SERIF, fontFaces, measure } from '../lib/fonts.mjs';

// The one main call to action: a wide button to the portfolio.
export function cta(t, data, cfg) {
  const W = cfg.cards.width;
  const H = 110;
  const host = cfg.portfolio.replace(/^https?:\/\//, '');
  const sans = (str, o) => text(str, { family: SANS, ...o });
  const label = 'View portfolio';
  const btnW = measure(label, { face: 'sans700', size: 15 }) + 64;
  const lead = 'Case studies, live mockups and my resume at ';

  const body = `
  <style>${fontFaces(['sans500', 'sans700', 'serif'])}</style>
  ${rect({ x: 0.5, y: 0.5, w: W - 1, h: H - 1, r: 18, fill: t.bg, stroke: t.stroke })}
  ${sans('SEE THE WORK', { x: 30, y: 42, size: 10.5, weight: 700, fill: t.muted, letterSpacing: 1.6 })}
  ${sans(lead, { x: 30, y: 74, size: 19, weight: 500, fill: t.textDim, letterSpacing: -0.2 })}
  ${text(host, { x: (30 + measure(lead, { face: 'sans500', size: 19, letterSpacing: -0.2 })).toFixed(1), y: 75, size: 23, weight: 400, family: SERIF, fill: t.accent, extra: 'font-style="italic"' })}
  ${rect({ x: W - 30 - btnW, y: 33, w: btnW, h: 44, r: 22, fill: t.accent })}
  ${sans(label + ' →', { x: W - 30 - btnW / 2, y: 60, size: 15, weight: 700, fill: t.onAccent, anchor: 'middle' })}`;

  return document_({ w: W, h: H, body, title: `View portfolio at ${host}` });
}
