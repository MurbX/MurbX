import { document_, rect, text } from '../lib/svg.mjs';
import { SANS, fontFaces, measure } from '../lib/fonts.mjs';

// An open-source tool, styled like the portfolio's Tools card. Release details
// (version, date, language, licence) come from GitHub at render time.
export function tool(t, data, cfg, index = 0) {
  const tl = cfg.tools[index];
  const info = data.tools?.[index] ?? {};
  const W = cfg.cards.width;
  const H = 262;
  const P = 30;
  const ink = t.name === 'light' ? '#141414' : '#1A1918';
  const sans = (str, o) => text(str, { family: SANS, ...o });

  const version = info.tag ? info.tag.replace(/^v/, 'v') : null;
  const nameW = measure(tl.name, { face: 'sans700', size: 28, letterSpacing: -0.8 });
  const versionPill = version
    ? `${rect({ x: P + 58 + nameW + 12, y: 40, w: measure(version, { face: 'sans500', size: 12 }) + 18, h: 22, r: 11, stroke: '#FFFFFF', strokeWidth: 1, opacity: 0.35 })}
       ${sans(version, { x: P + 58 + nameW + 21, y: 55, size: 12, weight: 500, fill: '#E7E2DA' })}`
    : '';
  const meta = [info.released && `Released ${info.released}`, info.language, info.license && `${info.license} licence`, tl.platform]
    .filter(Boolean)
    .join(' · ');

  const colW = (W - P * 2 - 12) / 2;
  // Shorten with an ellipsis only if the measured text really overflows.
  const fit = (str, max) => {
    const o = { face: 'sans500', size: 12.5 };
    if (measure(str, o) <= max) return str;
    let s = str;
    while (s.length > 1 && measure(s + '…', o) > max) s = s.slice(0, -1);
    return s.trimEnd() + '…';
  };
  const features = tl.features
    .map((f, i) => {
      const x = P + (i % 2) * (colW + 12);
      const y = 138 + Math.floor(i / 2) * 34;
      return `${rect({ x, y, w: colW, h: 28, r: 4, fill: '#22C55E', opacity: 0.09 })}
        ${sans('+', { x: x + 11, y: y + 18.5, size: 13, weight: 700, fill: '#4ADE80' })}
        ${sans(fit(f, colW - 40), { x: x + 26, y: y + 18.5, size: 12.5, weight: 500, fill: '#BBF7D0' })}`;
    })
    .join('');

  const btnY = 214;
  const dlW = 190;
  const body = `
  <style>${fontFaces(['sans500', 'sans700'])}</style>
  <defs>
    <clipPath id="tc"><rect width="${W}" height="${H}" rx="18"/></clipPath>
    <radialGradient id="tg" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${t.accent}" stop-opacity="0.38"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></radialGradient>
  </defs>
  <g clip-path="url(#tc)">
    ${rect({ x: 0, y: 0, w: W, h: H, fill: ink })}
    <ellipse cx="80" cy="${H + 20}" rx="300" ry="170" fill="url(#tg)"/>

    ${rect({ x: P, y: 30, w: 42, h: 42, r: 10, fill: '#FFFFFF', opacity: 0.1 })}
    <circle cx="${P + 21}" cy="51" r="10" fill="none" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="2.4"/>
    <circle cx="${P + 21}" cy="51" r="5" fill="#FF4D4D"><animate attributeName="opacity" values="1;0.4;1" dur="1.8s" repeatCount="indefinite"/></circle>
    ${sans(tl.name, { x: P + 58, y: 61, size: 28, weight: 700, fill: '#FFFFFF', letterSpacing: -0.8 })}
    ${versionPill}
    ${sans('OPEN SOURCE', { x: W - P, y: 46, size: 10.5, weight: 700, fill: '#8E887F', letterSpacing: 1.6, anchor: 'end' })}
    ${sans(`github.com/${tl.repo}`, { x: W - P, y: 64, size: 12, weight: 500, fill: '#A8A29A', anchor: 'end' })}

    ${sans(tl.tagline, { x: P, y: 100, size: 15.5, weight: 500, fill: '#D6D0C7' })}
    ${sans(meta, { x: P, y: 121, size: 12, weight: 500, fill: '#8E887F' })}
    ${features}

    ${rect({ x: P, y: btnY, w: dlW, h: 34, r: 17, fill: '#FFFFFF' })}
    <path transform="translate(${P + 16} ${btnY + 9})" d="M8 2.5v8M4.5 7.5L8 11l3.5-3.5M3 13.5h10" fill="none" stroke="#141414" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
    ${sans('Download for Windows', { x: P + 38, y: btnY + 22, size: 13.5, weight: 500, fill: '#141414' })}
    ${rect({ x: P + dlW + 10, y: btnY, w: 150, h: 34, r: 17, fill: '#FFFFFF', opacity: 0.08 })}
    ${rect({ x: P + dlW + 10, y: btnY, w: 150, h: 34, r: 17, stroke: '#FFFFFF', strokeWidth: 1, opacity: 0.18 })}
    ${sans('★  Star on GitHub', { x: P + dlW + 85, y: btnY + 22, size: 13.5, weight: 500, fill: '#FFFFFF', anchor: 'middle' })}
  </g>`;

  return document_({ w: W, h: H, body, title: `${tl.name}${version ? ' ' + version : ''}: ${tl.tagline}` });
}
