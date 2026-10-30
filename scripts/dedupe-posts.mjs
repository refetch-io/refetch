/**
 * Removes duplicate stories that Scout (userId "0") posted more than once.
 *
 * Stories are grouped by link, and Scout stories also by normalized title within
 * a few days (the same post reached through a short link and its real URL). The
 * oldest story in each group stays; later Scout copies are deleted together with
 * their comments, votes, saves, notifications and reports. Stories posted by
 * people are never deleted.
 *
 *   node --env-file=.env scripts/dedupe-posts.mjs           # dry run
 *   node --env-file=.env scripts/dedupe-posts.mjs --apply   # delete
 */

import { writeFileSync } from 'node:fs';
import { Client, Query, TablesDB } from 'node-appwrite';

const SCOUT_USER_ID = '0';
/** Same title from Scout within this window counts as the same story. */
const TITLE_WINDOW_DAYS = 7;
const PAGE = 500;

function env(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return '';
}

const apply = process.argv.includes('--apply');
const databaseId = env('APPWRITE_DATABASE_ID');
const tables = {
  posts: env('APPWRITE_POSTS_COLLECTION_ID'),
  comments: env('APPWRITE_COMMENTS_COLLECTION_ID'),
  votes: env('APPWRITE_VOTES_COLLECTION_ID'),
  saves: env('APPWRITE_SAVES_COLLECTION_ID') || 'saves',
  notifications: env('APPWRITE_NOTIFICATIONS_COLLECTION_ID') || 'notifications',
  reports: env('APPWRITE_REPORTS_COLLECTION_ID') || 'reports',
};
const tablesDB = new TablesDB(
  new Client()
    .setEndpoint(env('APPWRITE_ENDPOINT', 'NEXT_PUBLIC_APPWRITE_ENDPOINT'))
    .setProject(env('APPWRITE_PROJECT_ID', 'NEXT_PUBLIC_APPWRITE_PROJECT_ID'))
    .setKey(env('APPWRITE_API_KEY')),
);

async function listAll(tableId, queries) {
  const rows = [];
  let cursor;
  for (;;) {
    const page = await tablesDB.listRows({
      databaseId,
      tableId,
      queries: [...queries, Query.orderAsc('$sequence'), Query.limit(PAGE), ...(cursor ? [Query.cursorAfter(cursor)] : [])],
      total: false,
    });
    rows.push(...page.rows);
    if (page.rows.length < PAGE) return rows;
    cursor = page.rows[page.rows.length - 1].$id;
  }
}

export function normalizeTitle(title) {
  return String(title ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const posts = await listAll(tables.posts, [
  Query.select(['$id', '$createdAt', '$sequence', 'link', 'title', 'userId', 'channel', 'countUp', 'countDown', 'countComments']),
]);
console.log(`Scanned ${posts.length} stories`);

// Oldest first, so the first story seen for a link or title is the one we keep.
posts.sort((a, b) => Number(a.$sequence) - Number(b.$sequence));
const keptByLink = new Map();
const keptByTitle = new Map();
const duplicates = [];
for (const post of posts) {
  const link = post.link?.trim();
  const title = normalizeTitle(post.title);
  const created = Date.parse(post.$createdAt);
  const byLink = link ? keptByLink.get(link) : undefined;
  const byTitle = title ? keptByTitle.get(title) : undefined;
  const sameTitle =
    byTitle && byTitle.userId === SCOUT_USER_ID && created - Date.parse(byTitle.$createdAt) < TITLE_WINDOW_DAYS * 864e5;
  const original = byLink ?? (sameTitle ? byTitle : undefined);

  if (original && post.userId === SCOUT_USER_ID) {
    duplicates.push({ post, original });
    continue;
  }
  if (link && !byLink) keptByLink.set(link, post);
  if (title) keptByTitle.set(title, post);
}

const groups = new Map();
for (const { post, original } of duplicates) {
  const group = groups.get(original.$id) ?? { original, copies: [] };
  group.copies.push(post);
  groups.set(original.$id, group);
}
for (const { original, copies } of [...groups.values()].sort((a, b) => b.copies.length - a.copies.length)) {
  console.log(`${String(copies.length).padStart(4)} × ${original.title}  (${original.link}, kept ${original.$id})`);
}
console.log(`\n${duplicates.length} duplicate stories in ${groups.size} groups`);

if (!apply) {
  console.log('Dry run. Re-run with --apply to delete them.');
  process.exit(0);
}

const backup = `dedupe-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
writeFileSync(backup, JSON.stringify(duplicates.map(({ post, original }) => ({ ...post, duplicateOf: original.$id })), null, 2));
console.log(`Backed up the stories to ${backup}`);

async function deleteWhere(tableId, queries) {
  const rows = await listAll(tableId, [...queries, Query.select(['$id'])]);
  for (const row of rows) await tablesDB.deleteRow({ databaseId, tableId, rowId: row.$id });
  return rows.length;
}

let related = 0;
for (const [i, { post }] of duplicates.entries()) {
  const comments = await listAll(tables.comments, [Query.equal('postId', post.$id), Query.select(['$id'])]);
  for (const ids of [comments.map((c) => c.$id)].filter((ids) => ids.length > 0)) {
    related += await deleteWhere(tables.votes, [Query.equal('resourceType', 'comment'), Query.equal('resourceId', ids)]);
  }
  related += await deleteWhere(tables.comments, [Query.equal('postId', post.$id)]);
  related += await deleteWhere(tables.votes, [Query.equal('resourceType', 'post'), Query.equal('resourceId', post.$id)]);
  for (const table of [tables.saves, tables.notifications, tables.reports]) {
    related += await deleteWhere(table, [Query.equal('postId', post.$id)]).catch(() => 0);
  }
  await tablesDB.deleteRow({ databaseId, tableId: tables.posts, rowId: post.$id });
  if ((i + 1) % 25 === 0) console.log(`  deleted ${i + 1}/${duplicates.length}`);
}
console.log(`Deleted ${duplicates.length} stories and ${related} related rows`);
