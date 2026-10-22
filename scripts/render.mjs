#!/usr/bin/env node
// Renders every profile card, once per color scheme, into assets/.
//
//   PROFILE_TOKEN=$(gh auth token) node scripts/render.mjs
//
// Token precedence: PROFILE_TOKEN (a PAT that can see private work) falls back
// to GITHUB_TOKEN (the Actions bot — public contributions only).

import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchProfile } from './lib/github.mjs';
import { themes } from './lib/theme.mjs';
import { header } from './cards/header.mjs';
import { proof } from './cards/proof.mjs';
import { tool } from './cards/tool.mjs';
import { cta } from './cards/cta.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');

// "today", "3 days ago", "2 months ago".
function relativeDate(iso, now) {
  const days = Math.round((now - new Date(iso)) / 86_400_000);
  if (days < 1) return 'today';
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (days < 30) return rtf.format(-days, 'day');
  if (days < 365) return rtf.format(-Math.round(days / 30), 'month');
  return rtf.format(-Math.round(days / 365), 'year');
}

// Latest release and repo facts for each tool. Failures leave the card with its
// static text rather than breaking the render.
async function fetchTool(repo, token, now) {
  const get = async (path) => {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: { 'User-Agent': 'murbx-profile-renderer', Authorization: `bearer ${token}`, Accept: 'application/vnd.github+json' },
    });
    return res.ok ? res.json() : null;
  };
  const [info, release] = await Promise.all([get(`/repos/${repo}`), get(`/repos/${repo}/releases/latest`)]);
  return {
    language: info?.language ?? null,
    license: info?.license?.spdx_id && info.license.spdx_id !== 'NOASSERTION' ? info.license.spdx_id : null,
    tag: release?.tag_name ?? null,
    released: release?.published_at ? relativeDate(release.published_at, now) : null,
  };
}

async function main() {
  const token = process.env.PROFILE_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('Missing PROFILE_TOKEN or GITHUB_TOKEN.');
    console.error('Locally:  PROFILE_TOKEN=$(gh auth token) node scripts/render.mjs');
    process.exit(1);
  }

  const cfg = JSON.parse(await readFile(join(ROOT, 'profile.config.json'), 'utf8'));

  console.log(`Fetching contribution data for @${cfg.login} …`);
  const data = await fetchProfile({ token, login: cfg.login, log: (m) => console.log(m) });
  console.log(
    `  ${data.totals.contributions} contributions · ${data.totals.commits} commits ` +
      `(${data.totals.private} in private repos) · ${data.repos.length} repos`,
  );

  // The headshot is committed (assets/src) and inlined: camo renders these SVGs
  // as <img>, so a remote href would not load.
  const avatar = await readFile(join(ROOT, cfg.avatar));
  data.avatarDataUri = `data:image/jpeg;base64,${avatar.toString('base64')}`;
  data.tools = await Promise.all(cfg.tools.map((tl) => fetchTool(tl.repo, token, new Date(data.generatedAt))));

  const cards = { header, proof, cta, ...Object.fromEntries(cfg.tools.map((_, i) => [`tool-${i + 1}`, (t, d, c) => tool(t, d, c, i)])) };
  await mkdir(ASSETS, { recursive: true });

  const written = new Set();
  for (const [schemeName, palette] of Object.entries(themes(cfg.theme))) {
    for (const [cardName, render] of Object.entries(cards)) {
      const svg = render(palette, data, cfg);
      const name = `${cardName}-${schemeName}.svg`;
      await writeFile(join(ASSETS, name), svg, 'utf8');
      written.add(name);
      console.log(`  wrote assets/${name}  (${(svg.length / 1024).toFixed(1)} kB)`);
    }
  }

  // Remove cards that are no longer rendered, so stale files don't linger.
  for (const file of await readdir(ASSETS)) {
    if (file.endsWith('.svg') && !written.has(file)) {
      await unlink(join(ASSETS, file));
      console.log(`  removed assets/${file}`);
    }
  }

  // Snapshot the numbers so the README copy can be checked against real data.
  // Totals only: no repository or organisation names, since much of the work is
  // in private client repositories.
  await writeFile(
    join(ASSETS, 'data.json'),
    JSON.stringify(
      {
        generatedAt: data.generatedAt,
        totals: data.totals,
        followers: data.followers,
        stars: data.stars,
        ownedRepos: data.ownedRepos,
        contributedRepos: data.contributedRepos,
        reposCommittedTo: data.repos.length,
        tools: cfg.tools.map((tl, i) => ({ repo: tl.repo, ...data.tools[i] })),
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );

  console.log('Done.');
}

main().catch((err) => {
  console.error('Render failed:', err.message);
  process.exit(1);
});
