/**
 * Channels: keeps every channel stocked with fresh stories.
 *
 * Each run reads the channel catalog (`channels` table), fetches each channel's
 * RSS/Atom feeds and posts the newest story that isn't on Refetch yet, tagged
 * with the channel. Official sources win; community feeds only fill in when the
 * official ones have nothing new. Posts go through the regular pipeline
 * (Enhancement → Algorithm) like any other story.
 */

import { Client, ID, Query, TablesDB } from 'node-appwrite';

const SCOUT_USER_ID = '0';
const SCOUT_USER_NAME = 'Scout';

/** Stories posted per channel per run, and per run overall. */
const MAX_PER_CHANNEL = 1;
const MAX_PER_RUN = 25;
/** Only consider items published within this window. */
const MAX_AGE_HOURS = 72;
const FEED_TIMEOUT_MS = 10_000;
/** Newest items checked against existing posts, and the link budget per lookup query (limit 4096 chars). */
const MAX_CANDIDATES = 30;
const LINK_BATCH_CHARS = 3000;
const PAGE_SIZE = 500;
/** A story with the same title as one posted within this window is a duplicate. */
const TITLE_WINDOW_DAYS = 7;
const USER_AGENT = 'RefetchBot/1.0 (+https://refetch.io)';

function env(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return '';
}

/* ─────────────────────────────── Feed parsing ─────────────────────────────── */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decode(text) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match);
}

function stripHtml(html) {
  return decode(decode(html).replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block, names) {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
    if (match) return match[1];
  }
  return '';
}

function atomLink(block) {
  const links = [...block.matchAll(/<link\b([^>]*?)\/?>/gi)].map((m) => m[1]);
  const attr = (attrs, name) => attrs.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1];
  const alternate = links.find((attrs) => !attr(attrs, 'rel') || attr(attrs, 'rel') === 'alternate');
  return alternate ? attr(alternate, 'href') : undefined;
}

/** Minimal RSS 2.0 / Atom parser — enough for well-formed news feeds. */
export function parseFeed(xml, feedUrl) {
  const blocks = [...xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)].map((m) => m[0]);
  const items = [];
  for (const block of blocks) {
    let title = stripHtml(tag(block, ['title']));
    const link = (stripHtml(tag(block, ['link'])) || atomLink(block) || '').trim();
    const dateText = stripHtml(tag(block, ['pubDate', 'published', 'updated', 'dc:date']));
    const published = Date.parse(dateText);
    const summary = stripHtml(tag(block, ['description', 'summary', 'content:encoded', 'content']));
    if (!title || !/^https?:\/\//i.test(link) || Number.isNaN(published)) continue;

    // GitHub release feeds: keep real version releases only (skip monorepo
    // package tags and merge commits), and name the project ("1.7.4" alone
    // means nothing on a front page).
    const release = feedUrl.match(/github\.com\/([^/]+)\/([^/]+)\/releases\.atom/i);
    if (release) {
      const version = title.match(/^v?(\d+\.\d+(?:\.\d+)?(?:[-.][\w.]+)?)$/);
      if (!version) continue;
      const project = release[2].charAt(0).toUpperCase() + release[2].slice(1);
      title = `${project} ${version[1]} released`;
    }

    items.push({ title, link, published, summary });
  }
  return items;
}

async function fetchFeed(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return parseFeed(await response.text(), url);
}

/** Video ID of a YouTube watch, shorts, live, embed or youtu.be link. */
function youTubeVideoId(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^(www|m)\./, '');
    let id = null;
    if (host === 'youtu.be') id = parsed.pathname.slice(1);
    else if (host === 'youtube.com') {
      id = parsed.pathname === '/watch'
        ? parsed.searchParams.get('v')
        : parsed.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)/)?.[1] ?? null;
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Same normalization as the web app's duplicate check (YouTube keeps its video ID). */
function cleanUrl(url) {
  const videoId = youTubeVideoId(url);
  if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}

/** Lowercase letters and digits only, so punctuation and spacing don't hide a repeat. */
export function normalizeTitle(title) {
  return String(title ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/* ───────────────────────────────── Function ───────────────────────────────── */

export default async function ({ req, res, log, error }) {
  const endpoint = env('APPWRITE_ENDPOINT', 'NEXT_PUBLIC_APPWRITE_ENDPOINT', 'APPWRITE_FUNCTION_API_ENDPOINT');
  const projectId = env('APPWRITE_PROJECT_ID', 'NEXT_PUBLIC_APPWRITE_PROJECT_ID', 'APPWRITE_FUNCTION_PROJECT_ID');
  const apiKey = env('APPWRITE_API_KEY') || req.headers['x-appwrite-key'] || '';
  const databaseId = env('APPWRITE_DATABASE_ID');
  const postsTable = env('APPWRITE_POSTS_COLLECTION_ID');
  const channelsTable = env('APPWRITE_CHANNELS_COLLECTION_ID') || 'channels';

  if (!endpoint || !projectId || !apiKey || !databaseId || !postsTable) {
    error('Missing configuration (endpoint, project, API key, database or posts table).');
    return res.json({ ok: false, error: 'Missing configuration' }, 500);
  }

  const tablesDB = new TablesDB(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));
  const { rows: channels } = await tablesDB.listRows({
    databaseId,
    tableId: channelsTable,
    queries: [Query.orderAsc('position'), Query.limit(100)],
  });

  const since = Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000;
  const summary = [];
  let created = 0;

  /**
   * Links already posted. Queries are capped at 4096 characters, so check in batches,
   * and page through every match: a link posted more than once returns several rows,
   * so one page sized to the batch would push other links out and repost them.
   */
  async function existingLinks(links) {
    const batches = [[]];
    for (const link of new Set(links)) {
      const current = batches[batches.length - 1];
      if (current.length > 0 && JSON.stringify([...current, link]).length > LINK_BATCH_CHARS) batches.push([link]);
      else current.push(link);
    }
    const seen = new Set();
    for (const batch of batches) {
      if (batch.length === 0) continue;
      let cursor;
      for (;;) {
        const existing = await tablesDB.listRows({
          databaseId,
          tableId: postsTable,
          queries: [
            Query.equal('link', batch),
            Query.select(['$id', 'link']),
            Query.limit(PAGE_SIZE),
            ...(cursor ? [Query.cursorAfter(cursor)] : []),
          ],
          total: false,
        });
        for (const row of existing.rows) seen.add(row.link);
        if (existing.rows.length < PAGE_SIZE) break;
        cursor = existing.rows[existing.rows.length - 1].$id;
      }
    }
    return seen;
  }

  // Titles and links posted recently, and everything posted during this run. Several
  // channels share feeds (Planet PostgreSQL feeds PostgreSQL, Supabase and Databases),
  // and the same story can arrive through a short link and its real URL.
  const recentLinks = new Set();
  const recentTitles = new Set();
  {
    const recentSince = new Date(Date.now() - TITLE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    let cursor;
    for (;;) {
      const page = await tablesDB.listRows({
        databaseId,
        tableId: postsTable,
        queries: [
          Query.greaterThan('$createdAt', recentSince),
          Query.select(['$id', 'link', 'title']),
          Query.limit(PAGE_SIZE),
          ...(cursor ? [Query.cursorAfter(cursor)] : []),
        ],
        total: false,
      });
      for (const row of page.rows) {
        if (row.link) recentLinks.add(row.link);
        recentTitles.add(normalizeTitle(row.title));
      }
      if (page.rows.length < PAGE_SIZE) break;
      cursor = page.rows[page.rows.length - 1].$id;
    }
  }
  const isRecent = (item) => recentLinks.has(item.link) || recentTitles.has(normalizeTitle(item.title));

  async function stockChannel(channel) {
    const pools = [channel.sources ?? [], channel.communitySources ?? []];
    let candidates = [];
    for (const sources of pools) {
      const results = await Promise.allSettled(sources.map((url) => fetchFeed(url)));
      results.forEach((result, i) => {
        if (result.status === 'rejected') log(`[${channel.$id}] ${sources[i]}: ${result.reason?.message}`);
      });
      candidates = results
        .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
        .filter((item) => item.published >= since)
        .map((item) => ({ ...item, link: cleanUrl(item.link) }))
        .sort((a, b) => b.published - a.published);

      // Drop stories that are already on Refetch.
      candidates = candidates.filter((item) => !isRecent(item)).slice(0, MAX_CANDIDATES);
      const seen = await existingLinks(candidates.map((item) => item.link));
      candidates = candidates.filter((item) => !seen.has(item.link));
      if (candidates.length > 0) break; // official sources had something new
    }

    let posted = 0;
    for (const item of candidates) {
      if (posted >= MAX_PER_CHANNEL || created + posted >= MAX_PER_RUN) break;
      if (isRecent(item)) continue; // another channel posted it earlier in this run
      try {
        await tablesDB.createRow({
          databaseId,
          tableId: postsTable,
          rowId: ID.unique(),
          data: {
            title: item.title.slice(0, 300),
            description: item.summary.slice(0, 500),
            userId: SCOUT_USER_ID,
            userName: SCOUT_USER_NAME,
            count: 0,
            countUp: 0,
            countDown: 0,
            type: 'link',
            enhanced: false,
            timeScore: 100,
            link: item.link,
            channel: channel.$id,
          },
        });
        posted++;
        recentLinks.add(item.link);
        recentTitles.add(normalizeTitle(item.title));
        summary.push(`${channel.$id}: ${item.title}`);
      } catch (e) {
        error(`[${channel.$id}] failed to create "${item.title}": ${e.message}`);
      }
    }
    return posted;
  }

  // There are more channels than stories per run, so visit them in a fresh random
  // order each time; otherwise the ones at the end of the catalog would starve.
  for (let i = channels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [channels[i], channels[j]] = [channels[j], channels[i]];
  }

  for (const channel of channels) {
    if (created >= MAX_PER_RUN) break;
    try {
      created += await stockChannel(channel);
    } catch (e) {
      error(`[${channel.$id}] ${e.message}`);
    }
  }

  log(`Posted ${created} stories:\n${summary.join('\n')}`);
  return res.json({ ok: true, created, stories: summary });
}
