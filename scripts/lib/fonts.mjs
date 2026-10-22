// Brand fonts, embedded in each card. GitHub shows the cards as <img>, so remote
// fonts never load; these are small subsets (see scripts/fonts) inlined as data URIs.
// metrics.json holds each glyph's advance width, so layouts can measure text
// exactly instead of guessing.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fonts');
const METRICS = JSON.parse(readFileSync(join(DIR, 'metrics.json'), 'utf8'));

export const SANS = "Geist,ui-sans-serif,-apple-system,'Segoe UI',Roboto,Arial,sans-serif";
export const SERIF = "'Instrument Serif',Georgia,'Times New Roman',serif";

const FACES = {
  sans500: { family: 'Geist', weight: 500, style: 'normal', file: 'geist-500.woff', metrics: 'geist-500' },
  sans700: { family: 'Geist', weight: 700, style: 'normal', file: 'geist-700.woff', metrics: 'geist-700' },
  serif: { family: 'Instrument Serif', weight: 400, style: 'italic', file: 'serif-italic.woff', metrics: 'serif-italic' },
};

const cache = new Map();
function dataUri(file) {
  if (!cache.has(file)) cache.set(file, readFileSync(join(DIR, file)).toString('base64'));
  return `data:font/woff;base64,${cache.get(file)}`;
}

// A <style> block with the @font-face rules for the faces a card uses.
export function fontFaces(names = ['sans500', 'sans700']) {
  return names
    .map((n) => {
      const f = FACES[n];
      return `@font-face{font-family:'${f.family}';font-weight:${f.weight};font-style:${f.style};src:url(${dataUri(f.file)}) format('woff');}`;
    })
    .join('');
}

// Width of a string in px for a face at a size, with optional letter-spacing (px).
export function measure(str, { face = 'sans500', size = 14, letterSpacing = 0 } = {}) {
  const m = METRICS[FACES[face].metrics];
  let w = 0;
  for (const ch of String(str)) w += (m[ch] ?? 0.6) * size + letterSpacing;
  return w;
}
