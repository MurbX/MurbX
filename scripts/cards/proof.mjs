import { compact, document_, rect, text } from '../lib/svg.mjs';
import { SANS, fontFaces } from '../lib/fonts.mjs';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKS = 53;

// One card for the evidence: headline figures from the config, then live
// GitHub activity (commits across every repo the token can see, including
// private client work) and the year's contribution heatmap.
export function proof(t, data, cfg) {
  const W = cfg.cards.width;
  const H = 348;
  const PAD = 28;
  const sans = (str, o) => text(str, { family: SANS, ...o });

  // --- Headline figures.
  const n = cfg.highlights.length;
  const gap = 12;
  const tileW = (W - PAD * 2 - gap * (n - 1)) / n;
  const tiles = cfg.highlights
    .map((h, i) => {
      const x = PAD + i * (tileW + gap);
      return `
      ${rect({ x, y: 46, w: tileW, h: 84, r: 4, fill: t.panel, stroke: t.stroke })}
      ${i === 0 ? rect({ x, y: 46, w: 3, h: 84, fill: t.accent }) : ''}
      ${sans(h.value, { x: x + 18, y: 88, size: 30, weight: 700, fill: t.text, letterSpacing: -0.9 })}
      ${sans(h.label.toUpperCase(), { x: x + 18, y: 112, size: 10.5, weight: 700, fill: t.muted, letterSpacing: 1.3 })}`;
    })
    .join('');

  // --- Heatmap of the 53 weeks ending today.
  const GUTTER = 22;
  const gridX = PAD + GUTTER;
  const step = Math.floor(((W - PAD * 2 - GUTTER) / WEEKS) * 100) / 100;
  const cell = step - 3;
  const gridY = 208;
  const byDate = new Map(data.days.map((d) => [d.date, d.count]));
  const now = new Date(data.generatedAt);
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (WEEKS * 7 - 1));
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const columns = [];
  let max = 0;
  let yearTotal = 0;
  let activeDays = 0;
  for (let w = 0; w < WEEKS; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setUTCDate(start.getUTCDate() + w * 7 + d);
      const key = day.toISOString().slice(0, 10);
      const count = day > end ? null : byDate.get(key) || 0;
      if (count) {
        max = Math.max(max, count);
        yearTotal += count;
        activeDays += 1;
      }
      col.push({ count, date: day });
    }
    columns.push(col);
  }
  const level = (c) => (!c ? 0 : c / (max || 1) > 0.5 ? 4 : c / (max || 1) > 0.25 ? 3 : c / (max || 1) > 0.1 ? 2 : 1);

  // Cells fade in as a wave once per load; opacity 1 is the base state, so the
  // grid is complete even where animation is stripped.
  const cells = columns
    .map((col, w) =>
      col
        .map((day, d) => {
          if (day.count === null) return '';
          const x = (gridX + w * step).toFixed(2);
          const y = (gridY + d * step).toFixed(2);
          const delay = (w * 0.012 + d * 0.02).toFixed(3);
          return `<rect x="${x}" y="${y}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" rx="2" fill="${t.heat[level(day.count)]}"><animate attributeName="opacity" from="0" to="1" begin="${delay}s" dur="0.45s" fill="freeze"/></rect>`;
        })
        .join(''),
    )
    .join('');

  let lastMonth = -1;
  const months = columns
    .map((col, w) => {
      const m = col[0].date.getUTCMonth();
      if (m === lastMonth) return '';
      lastMonth = m;
      const x = gridX + w * step;
      return x > W - PAD - 28 ? '' : sans(MONTHS[m], { x, y: gridY - 9, size: 10, weight: 500, fill: t.muted });
    })
    .join('');
  const weekdays = [1, 3, 5]
    .map((d) => sans('SMTWTFS'[d], { x: PAD + 10, y: gridY + d * step + cell * 0.8, size: 9.5, weight: 500, fill: t.muted, anchor: 'end' }))
    .join('');

  const totals = data.totals;
  const privateShare = totals.commits ? Math.round((totals.private / totals.commits) * 100) : 0;
  const repos = data.repos.length;
  const summary = `${compact(yearTotal)} contributions this year · ${compact(totals.commits)} commits, ${privateShare}% in private client work · ${repos} repos`;

  const legendY = gridY + 7 * step + 16;
  const legendX = W - PAD - 118;
  const legend = `
    ${sans('less', { x: legendX - 7, y: legendY + 9, size: 10, weight: 500, fill: t.muted, anchor: 'end' })}
    ${t.heat.map((c, i) => rect({ x: legendX + i * 15, y: legendY, w: 11, h: 11, r: 2, fill: c })).join('')}
    ${sans('more', { x: legendX + 5 * 15 + 3, y: legendY + 9, size: 10, weight: 500, fill: t.muted })}`;

  const body = `
  <style>${fontFaces(['sans500', 'sans700'])}</style>
  ${rect({ x: 0.5, y: 0.5, w: W - 1, h: H - 1, r: 18, fill: t.bg, stroke: t.stroke })}
  ${sans('IMPACT', { x: PAD, y: 30, size: 10.5, weight: 700, fill: t.muted, letterSpacing: 1.6 })}
  ${tiles}
  <line x1="${PAD}" y1="152" x2="${W - PAD}" y2="152" stroke="${t.strokeSoft}"/>
  ${sans('ACTIVITY', { x: PAD, y: 176, size: 10.5, weight: 700, fill: t.muted, letterSpacing: 1.6 })}
  ${sans(summary, { x: W - PAD, y: 176, size: 12, weight: 500, fill: t.textDim, anchor: 'end' })}
  ${months}
  ${weekdays}
  ${cells}
  ${legend}
  ${sans(`${activeDays} active days · live from GitHub, updated every 6 hours`, { x: PAD, y: legendY + 9, size: 10.5, weight: 500, fill: t.muted })}`;

  return document_({ w: W, h: H, body, title: `${cfg.highlights.map((h) => `${h.value} ${h.label}`).join(', ')}. ${summary}.` });
}
