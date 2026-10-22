// Small SVG helpers. No dependencies — GitHub serves these through camo, which
// renders them as <img>: scripts never run and remote resources never load, so
// everything must be inline and self-contained (fonts come from fonts.mjs).

import { SANS } from './fonts.mjs';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

export function text(str, { x = 0, y = 0, size = 14, fill, weight = 400, family = SANS, anchor = 'start', opacity, letterSpacing, extra = '' } = {}) {
  const attrs = [
    `x="${x}"`,
    `y="${y}"`,
    `font-family="${family}"`,
    `font-size="${size}"`,
    `font-weight="${weight}"`,
    `fill="${fill}"`,
  ];
  if (anchor !== 'start') attrs.push(`text-anchor="${anchor}"`);
  if (opacity != null) attrs.push(`opacity="${opacity}"`);
  if (letterSpacing != null) attrs.push(`letter-spacing="${letterSpacing}"`);
  if (extra) attrs.push(extra);
  return `<text ${attrs.join(' ')}>${esc(str)}</text>`;
}

export function rect({ x, y, w, h, r = 0, fill = 'none', stroke, strokeWidth = 1, opacity, extra = '' }) {
  const attrs = [`x="${x}"`, `y="${y}"`, `width="${w}"`, `height="${h}"`];
  if (r) attrs.push(`rx="${r}"`);
  attrs.push(`fill="${fill}"`);
  if (stroke) attrs.push(`stroke="${stroke}"`, `stroke-width="${strokeWidth}"`);
  if (opacity != null) attrs.push(`opacity="${opacity}"`);
  if (extra) attrs.push(extra);
  return `<rect ${attrs.join(' ')}/>`;
}

export function document_({ w, h, body, title }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
${body}
</svg>
`;
}

export function compact(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(num >= 10_000_000 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(num >= 10_000 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return String(num);
}
