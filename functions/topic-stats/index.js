/**
 * Topic stats: ranks topics (post `topics` labels) by summed `score` on the top 1000
 * posts in the rolling 24h window (same filters as the main feed), writes `daily_topics`,
 * then recomputes all-time aggregates into `topics`.
 */

import crypto from 'crypto';
import { Client, TablesDB, Query } from 'node-appwrite';

const TOP_POSTS_LIMIT = 1000;
const FULL_SCAN_BATCH = 500;
const MAX_FULL_SCAN_DOCS = 200000;
const WRITE_CHUNK = 25;
const LIST_PAGE = 100;

function getEndpoint() {
  return (
    process.env.APPWRITE_ENDPOINT ||
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
    ''
  );
}

function getProjectId() {
  return process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '';
}

function twentyFourHoursAgoIso() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

/** Appwrite custom document IDs must be <= 36 chars */
function stableDocId(parts) {
  return crypto.createHash('sha256').update(parts.join('\0')).digest('hex').slice(0, 36);
}

function normalizeTopicKey(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const slug = s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (slug.length > 0) return slug.slice(0, 80);
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 32);
}

/**
 * @param {import('node-appwrite').Models.Row[]} documents
 * @returns {Map<string, { topicKey: string, topicLabel: string, totalScore: number, articleCount: number }>}
 */
function aggregateTopicsFromPosts(documents) {
  const map = new Map();
  for (const post of documents) {
    const topics = Array.isArray(post.topics) ? post.topics : [];
    const score = Number(post.score);
    const s = Number.isFinite(score) ? score : 0;
    if (topics.length === 0) continue;
    const seenKeys = new Set();
    for (const raw of topics) {
      const topicKey = normalizeTopicKey(raw);
      if (!topicKey || seenKeys.has(topicKey)) continue;
      seenKeys.add(topicKey);
      const topicLabel = String(raw).trim() || topicKey;
      const cur = map.get(topicKey);
      if (!cur) {
        map.set(topicKey, { topicKey, topicLabel, totalScore: s, articleCount: 1 });
      } else {
        cur.totalScore += s;
        cur.articleCount += 1;
      }
    }
  }
  return map;
}

function rankAggregates(map) {
  const rows = [...map.values()].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.articleCount !== a.articleCount) return b.articleCount - a.articleCount;
    return a.topicKey.localeCompare(b.topicKey);
  });
  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

async function fetchTopDailyPosts(databases, databaseId, postsCollectionId, log) {
  const queries = [
    Query.greaterThan('$createdAt', twentyFourHoursAgoIso()),
    Query.lessThan('spamScore', 70),
    Query.greaterThan('relevancyScore', 30),
    Query.equal('enhanced', true),
    Query.orderDesc('score'),
    Query.orderDesc('$createdAt'),
    Query.limit(TOP_POSTS_LIMIT),
    Query.select(['$id', 'topics', 'score']),
  ];
  const res = await tablesDB.listRows(databaseId, postsCollectionId, queries);
  log(`Fetched ${res.rows.length} posts for daily topic snapshot (limit ${TOP_POSTS_LIMIT})`);
  return res.rows;
}

async function deleteDailyTopicsForDate(databases, databaseId, dailyCollectionId, date, log) {
  let removed = 0;
  let cursor = null;
  for (;;) {
    const queries = [
      Query.equal('date', date),
      Query.orderAsc('$id'),
      Query.limit(LIST_PAGE),
    ];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const res = await tablesDB.listRows(databaseId, dailyCollectionId, queries);
    if (!res.rows.length) break;
    for (const doc of res.rows) {
      await tablesDB.deleteRow(databaseId, dailyCollectionId, doc.$id);
      removed++;
    }
    if (res.rows.length < LIST_PAGE) break;
    cursor = res.rows[res.rows.length - 1].$id;
  }
  if (removed) log(`Removed ${removed} previous daily_topics rows for ${date}`);
}

async function writeDailyTopics(
  databases,
  databaseId,
  dailyCollectionId,
  date,
  ranked,
  log
) {
  await deleteDailyTopicsForDate(databases, databaseId, dailyCollectionId, date, log);
  const now = new Date().toISOString();
  for (let i = 0; i < ranked.length; i += WRITE_CHUNK) {
    const slice = ranked.slice(i, i + WRITE_CHUNK);
    await Promise.all(
      slice.map((row) => {
        const documentId = stableDocId(['daily_topic', date, row.topicKey]);
        return tablesDB.createRow(databaseId, dailyCollectionId, documentId, {
          date,
          topicKey: row.topicKey,
          topicLabel: row.topicLabel,
          totalScore: row.totalScore,
          articleCount: row.articleCount,
          rank: row.rank,
          computedAt: now,
        });
      })
    );
  }
  log(`Wrote ${ranked.length} daily_topics documents for ${date}`);
}

async function scanAllPostsForTopics(databases, databaseId, postsCollectionId, log, error) {
  const map = new Map();
  let cursor = null;
  let total = 0;
  for (;;) {
    if (total >= MAX_FULL_SCAN_DOCS) {
      log(`Full scan capped at ${MAX_FULL_SCAN_DOCS} documents`);
      break;
    }
    const queries = [
      Query.equal('enhanced', true),
      Query.orderAsc('$id'),
      Query.limit(FULL_SCAN_BATCH),
      Query.select(['$id', 'topics', 'score']),
    ];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    let res;
    try {
      res = await tablesDB.listRows(databaseId, postsCollectionId, queries);
    } catch (e) {
      error(`Full-scan listRows failed: ${e.message}`);
      throw e;
    }
    if (!res.rows.length) break;
    const batchMap = aggregateTopicsFromPosts(res.rows);
    for (const [k, v] of batchMap) {
      const cur = map.get(k);
      if (!cur) map.set(k, { ...v });
      else {
        cur.totalScore += v.totalScore;
        cur.articleCount += v.articleCount;
      }
    }
    total += res.rows.length;
    if (res.rows.length < FULL_SCAN_BATCH) break;
    cursor = res.rows[res.rows.length - 1].$id;
    await new Promise((r) => setTimeout(r, 40));
  }
  log(`All-time topic scan processed ${total} enhanced posts`);
  return map;
}

async function upsertTopicDocuments(
  databases,
  databaseId,
  topicsCollectionId,
  ranked,
  log
) {
  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;
  for (let i = 0; i < ranked.length; i += WRITE_CHUNK) {
    const slice = ranked.slice(i, i + WRITE_CHUNK);
    const outcomes = await Promise.all(
      slice.map(async (row) => {
        const documentId = stableDocId(['topic', row.topicKey]);
        const payload = {
          topicKey: row.topicKey,
          topicLabel: row.topicLabel,
          totalScore: row.totalScore,
          articleCount: row.articleCount,
          lastComputedAt: now,
        };
        try {
          await tablesDB.updateRow(databaseId, topicsCollectionId, documentId, payload);
          return 'u';
        } catch (e) {
          const code = e?.code ?? e?.response?.status;
          const type = e?.type;
          if (code === 404 || type === 'document_not_found') {
            await tablesDB.createRow(databaseId, topicsCollectionId, documentId, payload);
            return 'c';
          }
          throw e;
        }
      })
    );
    for (const o of outcomes) {
      if (o === 'c') created++;
      else if (o === 'u') updated++;
    }
  }
  log(`topics collection: ${created} created, ${updated} updated (${ranked.length} keys)`);
}

export default async function ({ req, res, log, error }) {
  const started = Date.now();
  try {
    const endpoint = getEndpoint();
    const projectId = getProjectId();
    const apiKey = process.env.APPWRITE_API_KEY || '';
    const databaseId = process.env.APPWRITE_DATABASE_ID || '';
    const postsCollectionId = process.env.APPWRITE_POSTS_COLLECTION_ID || '';
    const dailyTopicsCollectionId = process.env.APPWRITE_DAILY_TOPICS_COLLECTION_ID || '';
    const topicsCollectionId = process.env.APPWRITE_TOPICS_COLLECTION_ID || '';

    if (!endpoint || !projectId || !apiKey || !databaseId || !postsCollectionId) {
      throw new Error('Missing Appwrite endpoint, project, API key, database, or posts collection');
    }
    if (!dailyTopicsCollectionId || !topicsCollectionId) {
      throw new Error(
        'Set APPWRITE_DAILY_TOPICS_COLLECTION_ID and APPWRITE_TOPICS_COLLECTION_ID'
      );
    }

    const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const tablesDB = new TablesDB(client);

    const utcDate = new Date().toISOString().slice(0, 10);
    log(`Topic stats run for UTC date ${utcDate}`);

    const topPosts = await fetchTopDailyPosts(databases, databaseId, postsCollectionId, log);
    const dailyMap = aggregateTopicsFromPosts(topPosts);
    const dailyRanked = rankAggregates(dailyMap);

    await writeDailyTopics(
      databases,
      databaseId,
      dailyTopicsCollectionId,
      utcDate,
      dailyRanked,
      log
    );

    const allTimeMap = await scanAllPostsForTopics(
      databases,
      databaseId,
      postsCollectionId,
      log,
      error
    );
    const allTimeRanked = rankAggregates(allTimeMap);
    await upsertTopicDocuments(
      databases,
      databaseId,
      topicsCollectionId,
      allTimeRanked,
      log
    );

    const elapsed = `${((Date.now() - started) / 1000).toFixed(1)}s`;
    return res.json({
      status: 'success',
      utcDate,
      dailyTopicsWritten: dailyRanked.length,
      allTimeTopicsUpserted: allTimeRanked.length,
      topPostsSampled: topPosts.length,
      elapsed,
      trigger: req.headers['x-appwrite-trigger'] || 'unknown',
    });
  } catch (err) {
    error(`topic-stats: ${err.message}`);
    return res.json(
      {
        status: 'error',
        message: err.message,
        elapsed: `${((Date.now() - started) / 1000).toFixed(1)}s`,
      },
      500
    );
  }
}
