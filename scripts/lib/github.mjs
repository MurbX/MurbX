// GitHub data layer.
//
// Why this doesn't just read contributionsCollection:
//
// The contribution graph undercounts this profile badly. Commits to private and
// org repos are correctly attributed (the REST API resolves author_login), but
// contributionsCollection returns only public repos and reports
// restrictedContributionsCount: 0 — so ~90% of real work vanishes. Most of the
// work lives in clients' and organisations' repos, which is exactly what gets lost.
//
// So commits, the heatmap, and the repo breakdown are built by walking the
// commit list of every accessible repo. contributionsCollection is still merged
// in afterwards, so contributions to repos access has since been lost are not
// dropped. Requires a token with `repo` scope; see README setup.

const REST = 'https://api.github.com';
const GRAPHQL = 'https://api.github.com/graphql';
const CONCURRENCY = 8;

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'murbx-profile-renderer',
  };
}

async function request(url, token, { retries = 3 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, { headers: headers(token) });

    if (res.status === 403 || res.status === 429) {
      const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000;
      const remaining = Number(res.headers.get('x-ratelimit-remaining'));
      if (remaining === 0 && reset) {
        const waitMs = Math.min(Math.max(reset - Date.now(), 0) + 1000, 60_000);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
    }
    if (res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    // Empty repos 409, gone repos 404 — neither is fatal for a profile render.
    if (res.status === 404 || res.status === 409) return { ok: false, status: res.status, body: null };
    if (!res.ok) throw new Error(`${res.status} ${url.replace(REST, '')}: ${(await res.text()).slice(0, 200)}`);

    return { ok: true, status: res.status, body: await res.json(), link: res.headers.get('link') };
  }
  throw new Error(`Unreachable after retries: ${url}`);
}

async function paginate(url, token, { max = 20 } = {}) {
  const out = [];
  let next = url;
  for (let page = 0; page < max && next; page++) {
    const res = await request(next, token);
    if (!res.ok || !Array.isArray(res.body)) break;
    out.push(...res.body);
    const match = res.link?.match(/<([^>]+)>;\s*rel="next"/);
    next = match ? match[1] : null;
  }
  return out;
}

async function pool(items, worker, limit = CONCURRENCY) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

async function gql(token, query, variables) {
  const res = await fetch(GRAPHQL, {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data;
}

const USER_QUERY = `
query User($login: String!) {
  user(login: $login) {
    login name createdAt avatarUrl(size: 200)
    followers { totalCount }
    repositories(first: 100, ownerAffiliations: [OWNER], isFork: false) {
      totalCount
      nodes { stargazerCount }
    }
  }
}`;

const YEAR_QUERY = `
query Year($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      totalPullRequestContributions
      totalIssueContributions
      totalPullRequestReviewContributions
      contributionCalendar {
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

export async function fetchProfile({ token, login, now = new Date(), log = () => {} }) {
  const { user } = await gql(token, USER_QUERY, { login });
  if (!user) throw new Error(`No such user: ${login}`);

  // ---- 1. every repo the token can reach --------------------------------
  const rawRepos = await paginate(
    `${REST}/user/repos?affiliation=owner,collaborator,organization_member&per_page=100&sort=pushed`,
    token,
  );
  const candidates = rawRepos.filter((r) => !r.fork && !r.archived);
  log(`  ${candidates.length} accessible repos (${rawRepos.length - candidates.length} forks/archived skipped)`);

  // ---- 2. commits authored by this user, per repo ------------------------
  const floor = new Date(user.createdAt);
  floor.setUTCFullYear(floor.getUTCFullYear() - 1); // tolerate imported history
  const ceiling = new Date(now.getTime() + 36 * 3600 * 1000);

  const harvest = await pool(candidates, async (repo) => {
    const commits = await paginate(
      `${REST}/repos/${repo.full_name}/commits?author=${encodeURIComponent(login)}&per_page=100`,
      token,
      { max: 12 },
    );
    const dates = commits
      .map((c) => new Date(c.commit?.author?.date || c.commit?.committer?.date))
      .filter((d) => !Number.isNaN(+d) && d >= floor && d <= ceiling);
    return { repo, dates };
  });

  // ---- 3. languages, only for repos actually contributed to --------------
  const touched = harvest.filter((h) => h.dates.length > 0);
  log(`  ${touched.length} repos with commits by @${login}`);

  const langResults = await pool(touched, async ({ repo }) => {
    const res = await request(`${REST}/repos/${repo.full_name}/languages`, token);
    return res.ok ? res.body : {};
  });

  // ---- 4. shape it -------------------------------------------------------
  const dayCounts = new Map();
  const repos = [];
  const langBytes = new Map();

  touched.forEach(({ repo, dates }, i) => {
    for (const d of dates) {
      const key = d.toISOString().slice(0, 10);
      dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
    }
    repos.push({
      key: repo.full_name,
      name: repo.name,
      owner: repo.owner.login,
      avatar: repo.owner.avatar_url,
      isPrivate: repo.private,
      isOrg: repo.owner.type === 'Organization',
      language: repo.language,
      commits: dates.length,
      lastPush: repo.pushed_at,
    });
    for (const [name, bytes] of Object.entries(langResults[i] || {})) {
      const cur = langBytes.get(name) || 0;
      langBytes.set(name, cur + bytes);
    }
  });

  // ---- 5. GraphQL for PR/issue/review totals + calendar merge ------------
  const years = [];
  for (let y = new Date(user.createdAt).getUTCFullYear(); y <= now.getUTCFullYear(); y++) years.push(y);

  const totals = { commits: 0, pullRequests: 0, issues: 0, reviews: 0, private: 0, contributions: 0 };

  for (const y of years) {
    const from = new Date(Date.UTC(y, 0, 1)).toISOString();
    const yearEnd = new Date(Date.UTC(y + 1, 0, 1));
    const to = (yearEnd > now ? now : yearEnd).toISOString();
    const { user: u } = await gql(token, YEAR_QUERY, { login, from, to });
    const c = u.contributionsCollection;
    totals.pullRequests += c.totalPullRequestContributions;
    totals.issues += c.totalIssueContributions;
    totals.reviews += c.totalPullRequestReviewContributions;

    // Merge, don't sum: a public commit appears in both sources. Taking the
    // larger of the two keeps contributions from repos we can no longer read
    // without double-counting the ones we just walked.
    for (const week of c.contributionCalendar.weeks) {
      for (const d of week.contributionDays) {
        if (!d.contributionCount) continue;
        dayCounts.set(d.date, Math.max(dayCounts.get(d.date) || 0, d.contributionCount));
      }
    }
  }

  const days = [...dayCounts.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  totals.activeDays = days.filter((d) => d.count > 0).length;
  totals.commits = repos.reduce((s, r) => s + r.commits, 0);
  totals.private = repos.filter((r) => r.isPrivate).reduce((s, r) => s + r.commits, 0);
  totals.contributions = days.reduce((s, d) => s + d.count, 0) + totals.pullRequests + totals.issues;

  repos.sort((a, b) => b.commits - a.commits);

  const owners = new Map();
  for (const r of repos) {
    const cur = owners.get(r.owner) || { login: r.owner, avatar: r.avatar, commits: 0, repos: 0, isOrg: r.isOrg };
    cur.commits += r.commits;
    cur.repos += 1;
    owners.set(r.owner, cur);
  }

  const languages = [...langBytes.entries()]
    .map(([name, bytes]) => ({ name, bytes, color: LANG_COLORS[name] || '#8B949E' }))
    .sort((a, b) => b.bytes - a.bytes);
  const totalBytes = languages.reduce((s, l) => s + l.bytes, 0) || 1;
  for (const l of languages) l.share = l.bytes / totalBytes;

  return {
    login: user.login,
    name: user.name,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    followers: user.followers.totalCount,
    ownedRepos: user.repositories.totalCount,
    stars: user.repositories.nodes.reduce((s, r) => s + r.stargazerCount, 0),
    contributedRepos: repos.filter((r) => r.owner !== login).length,
    totals,
    days,
    repos,
    owners: [...owners.values()].sort((a, b) => b.commits - a.commits),
    languages,
    streak: computeStreak(days, now),
    generatedAt: now.toISOString(),
  };
}

// A missing day is a zero day. Today never breaks the current streak, since
// the day is still in progress.
export function computeStreak(days, now) {
  const byDate = new Map(days.map((d) => [d.date, d.count]));
  const today = now.toISOString().slice(0, 10);

  let longest = 0;
  let run = 0;
  let previous = null;
  for (const d of days) {
    if (previous) {
      const gap = (new Date(d.date) - new Date(previous)) / 86_400_000;
      if (gap > 1) run = 0;
    }
    run = d.count > 0 ? run + 1 : 0;
    if (run > longest) longest = run;
    previous = d.date;
  }

  let current = 0;
  const cursor = new Date(`${today}T00:00:00Z`);
  for (let i = 0; i < 3660; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (byDate.get(key) > 0) current++;
    else if (key !== today) break;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return { current, longest };
}

// GitHub's linguist colors for the languages this profile actually uses.
const LANG_COLORS = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Dart: '#00B4AB', Python: '#3572A5',
  PHP: '#4F5D95', HTML: '#e34c26', CSS: '#563d7c', SCSS: '#c6538c', Less: '#1d365d',
  Shell: '#89e051', Ruby: '#701516', Go: '#00ADD8', Rust: '#dea584', Java: '#b07219',
  Kotlin: '#A97BFF', Swift: '#F05138', 'C++': '#f34b7d', C: '#555555', 'C#': '#178600',
  Vue: '#41b883', Svelte: '#ff3e00', Astro: '#ff5a03', Dockerfile: '#384d54',
  Makefile: '#427819', PLpgSQL: '#336790', TSQL: '#e38c00', Batchfile: '#C1F12E',
  PowerShell: '#012456', Handlebars: '#f7931e', EJS: '#a91e50', Blade: '#f7523f',
  Objective_C: '#438eff', 'Objective-C': '#438eff', CMake: '#DA3434', Procfile: '#a91e50',
  Nix: '#7e7eff', Lua: '#000080', Perl: '#0298c3', Jinja: '#a52a22', Mustache: '#724b3b',
};
