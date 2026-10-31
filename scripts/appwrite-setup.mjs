/**
 * Refetch Appwrite bootstrap (tables, columns, indexes, optional functions & buckets).
 *
 * Required (any one name per row is enough):
 *   API endpoint: APPWRITE_ENDPOINT or NEXT_PUBLIC_APPWRITE_ENDPOINT
 *   Project ID: APPWRITE_PROJECT_ID or NEXT_PUBLIC_APPWRITE_PROJECT_ID
 *   APPWRITE_API_KEY
 *   APPWRITE_DATABASE_ID
 *
 * Table IDs default to human-readable slugs; override with env to attach to an existing project
 * (env vars still use *_COLLECTION_ID for backward compatibility):
 *   APPWRITE_POSTS_COLLECTION_ID, APPWRITE_COMMENTS_COLLECTION_ID, APPWRITE_VOTES_COLLECTION_ID,
 *   APPWRITE_KEYS_COLLECTION_ID, APPWRITE_DAILY_TOPICS_COLLECTION_ID, APPWRITE_TOPICS_COLLECTION_ID,
 *   APPWRITE_CHANNELS_COLLECTION_ID, APPWRITE_CHANNEL_MEMBERS_COLLECTION_ID,
 *   APPWRITE_NOTIFICATIONS_COLLECTION_ID, APPWRITE_SAVES_COLLECTION_ID, APPWRITE_REPORTS_COLLECTION_ID
 *
 * Channels are seeded from scripts/channels.json (name, sources, keywords…);
 * member counts are never overwritten. Channel icons are PNGs in scripts/channel-icons/<id>.png,
 * uploaded to the public "channel-icons" bucket (APPWRITE_CHANNEL_ICONS_BUCKET_ID). A channel
 * without a local PNG keeps whatever icon file ID is set on its row, so icons can also be
 * uploaded from the Console.
 *
 * Functions: matched by display name (must match the Appwrite Console function name exactly).
 *   On first run a new function id is generated. Function **variables** are not managed here — set
 *   them (and secrets) manually in the Appwrite Console for each function. **Deployments** are not
 *   uploaded by this script — deploy function code from the Appwrite Console or CLI.
 *
 * Index note: UTF-8 index byte limit (~767). Full-text on long string columns uses lengths: [191, …].
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  Client,
  Compression,
  Functions,
  ID,
  Permission,
  Query,
  Role,
  Runtime,
  Storage,
  TablesDB,
} from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';

const APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT ||
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  '';
const APPWRITE_PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  '';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || '';
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '';

const COLLECTION_IDS = {
  posts: process.env.APPWRITE_POSTS_COLLECTION_ID || 'posts',
  comments: process.env.APPWRITE_COMMENTS_COLLECTION_ID || 'comments',
  votes: process.env.APPWRITE_VOTES_COLLECTION_ID || 'votes',
  keys: process.env.APPWRITE_KEYS_COLLECTION_ID || 'keys',
  daily_topics: process.env.APPWRITE_DAILY_TOPICS_COLLECTION_ID || 'daily_topics',
  topics: process.env.APPWRITE_TOPICS_COLLECTION_ID || 'topics',
  channels: process.env.APPWRITE_CHANNELS_COLLECTION_ID || 'channels',
  channel_members: process.env.APPWRITE_CHANNEL_MEMBERS_COLLECTION_ID || 'channel_members',
  profiles: process.env.APPWRITE_PROFILES_COLLECTION_ID || 'profiles',
  user_blocks: process.env.APPWRITE_BLOCKS_COLLECTION_ID || 'user_blocks',
  user_follows: process.env.APPWRITE_FOLLOWS_COLLECTION_ID || 'user_follows',
  conversations: process.env.APPWRITE_CONVERSATIONS_COLLECTION_ID || 'conversations',
  conversation_members: process.env.APPWRITE_CONVERSATION_MEMBERS_COLLECTION_ID || 'conversation_members',
  messages: process.env.APPWRITE_MESSAGES_COLLECTION_ID || 'messages',
  message_reactions: process.env.APPWRITE_MESSAGE_REACTIONS_COLLECTION_ID || 'message_reactions',
  notifications: process.env.APPWRITE_NOTIFICATIONS_COLLECTION_ID || 'notifications',
  saves: process.env.APPWRITE_SAVES_COLLECTION_ID || 'saves',
  reports: process.env.APPWRITE_REPORTS_COLLECTION_ID || 'reports',
};

/**
 * Public content: anyone can read through the Appwrite API, but every write goes
 * through the web app or a function with the API key, which checks ownership.
 */
const PUBLIC_READ_PERMS = [Permission.read(Role.any())];

/** Server SDK only (API key). Never expose secrets via client permissions. */
const SERVER_ONLY_PERMS = [];

function log(message, type = 'info') {
  const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
  console.log(`${icons[type] || '•'} ${message}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function undef(v) {
  return v === null || v === undefined ? undefined : v;
}

async function waitForColumn(tablesDB, databaseId, tableId, key, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const col = await tablesDB.getColumn(databaseId, tableId, key);
    if (col.status === 'available') return;
    if (col.status === 'failed') {
      throw new Error(`Column "${key}" failed provisioning in ${tableId}`);
    }
    await sleep(400);
  }
  throw new Error(`Timeout waiting for column "${key}" in ${tableId}`);
}

async function waitForIndex(tablesDB, databaseId, tableId, key, timeoutMs = 180000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const idx = await tablesDB.getIndex(databaseId, tableId, key);
    if (idx.status === 'available') return;
    if (idx.status === 'failed') {
      throw new Error(`Index "${key}" failed in ${tableId}`);
    }
    await sleep(600);
  }
  throw new Error(`Timeout waiting for index "${key}" in ${tableId}`);
}

function buildCollectionDefinitions() {
  return [
    {
      id: COLLECTION_IDS.posts,
      name: 'Posts',
      permissions: PUBLIC_READ_PERMS,
      rowSecurity: false,
      // Mirrors Appwrite console: title/userId/userName required; topics = string[] with 256 chars per element.
      attributes: [
        { key: 'title', type: 'string', size: 2048, required: true, array: false, default: null },
        { key: 'description', type: 'string', size: 2048, required: false, array: false, default: null },
        { key: 'userId', type: 'string', size: 512, required: true, array: false, default: null },
        { key: 'userName', type: 'string', size: 512, required: true, array: false, default: null },
        { key: 'countUp', type: 'integer', required: false, array: false, default: null },
        { key: 'countDown', type: 'integer', required: false, array: false, default: null },
        { key: 'link', type: 'string', size: 2048, required: false, array: false, default: null },
        { key: 'type', type: 'string', size: 512, required: false, array: false, default: null },
        { key: 'count', type: 'integer', required: false, array: false, default: null },
        { key: 'enhanced', type: 'boolean', required: false, array: false, default: null },
        { key: 'language', type: 'string', size: 10, required: false, array: false, default: 'en' },
        { key: 'spellingScore', type: 'integer', required: false, array: false, default: null },
        { key: 'spellingIssues', type: 'string', size: 100000, required: false, array: true, default: null },
        { key: 'spamScore', type: 'integer', required: false, array: false, default: null },
        { key: 'spamIssues', type: 'string', size: 100000, required: false, array: true, default: null },
        { key: 'safetyScore', type: 'integer', required: false, array: false, default: null },
        { key: 'safetyIssues', type: 'string', size: 100000, required: false, array: true, default: null },
        { key: 'qualityScore', type: 'integer', required: false, array: false, default: null },
        { key: 'qualityIssues', type: 'string', size: 100000, required: false, array: true, default: null },
        { key: 'optimizedTitle', type: 'string', size: 2048, required: false, array: false, default: null },
        { key: 'optimizedDescription', type: 'string', size: 2048, required: false, array: false, default: null },
        { key: 'readingLevel', type: 'string', size: 64, required: false, array: false, default: null },
        { key: 'readingTime', type: 'integer', required: false, array: false, default: null },
        { key: 'topics', type: 'string', size: 256, required: false, array: true, default: null },
        { key: 'countComments', type: 'integer', required: false, array: false, default: null },
        { key: 'tldr', type: 'string', size: 100000, required: false, array: false, default: null },
        { key: 'timeScore', type: 'integer', required: false, array: false, default: null },
        { key: 'score', type: 'integer', required: false, array: false, default: null },
        { key: 'sensationScore', type: 'integer', required: false, array: false, default: null },
        { key: 'diversityScore', type: 'integer', required: false, array: false, default: null },
        { key: 'relevancyScore', type: 'integer', required: false, array: false, default: null },
        { key: 'channel', type: 'string', size: 64, required: false, array: false, default: null },
        { key: 'countReports', type: 'integer', required: false, array: false, default: null },
        // Publisher a story came from when the domain alone doesn't say (a YouTube channel URL).
        { key: 'source', type: 'string', size: 256, required: false, array: false, default: null },
        // Audience of that publisher (YouTube subscribers), used as a ranking signal.
        { key: 'sourceFollowers', type: 'integer', required: false, array: false, default: null },
      ],
      indexes: [
        { key: 'index_1', type: 'key', columns: ['userId'], orders: ['ASC'] },
        { key: 'index_2', type: 'key', columns: ['enhanced'], orders: ['ASC'] },
        { key: 'index_3', type: 'key', columns: ['score'], orders: ['DESC'] },
        {
          key: 'search',
          type: 'fulltext',
          columns: ['title', 'description'],
          orders: undefined,
          lengths: [191, 191],
        },
        { key: 'index_title', type: 'fulltext', columns: ['title'], orders: undefined, lengths: [191] },
        { key: 'index_channel', type: 'key', columns: ['channel'], orders: ['ASC'] },
      ],
    },
    {
      id: COLLECTION_IDS.comments,
      name: 'Comments',
      permissions: PUBLIC_READ_PERMS,
      rowSecurity: false,
      attributes: [
        { key: 'postId', type: 'string', size: 512, required: true, array: false, default: null },
        { key: 'userId', type: 'string', size: 512, required: true, array: false, default: null },
        { key: 'userName', type: 'string', size: 512, required: true, array: false, default: null },
        { key: 'content', type: 'string', size: 100000, required: true, array: false, default: null },
        { key: 'replyId', type: 'string', size: 512, required: false, array: false, default: null },
        { key: 'countReports', type: 'integer', required: false, array: false, default: null },
        { key: 'count', type: 'integer', required: false, array: false, default: null },
        { key: 'countUp', type: 'integer', required: false, array: false, default: null },
        { key: 'countDown', type: 'integer', required: false, array: false, default: null },
        { key: 'editedAt', type: 'datetime', required: false, array: false, default: null },
      ],
      indexes: [
        { key: 'index_1', type: 'key', columns: ['postId'], orders: ['ASC'] },
        { key: 'index_2', type: 'key', columns: ['userId'], orders: ['ASC'] },
        { key: 'index_3', type: 'key', columns: ['count'], orders: ['ASC'] },
      ],
    },
    {
      id: COLLECTION_IDS.votes,
      name: 'Votes',
      permissions: SERVER_ONLY_PERMS,
      rowSecurity: false,
      attributes: [
        { key: 'count', type: 'integer', required: false, array: false, default: null },
        { key: 'resourceId', type: 'string', size: 512, required: true, array: false, default: null },
        { key: 'userId', type: 'string', size: 512, required: true, array: false, default: null },
        { key: 'resourceType', type: 'string', size: 512, required: true, array: false, default: null },
      ],
      indexes: [
        { key: 'index_1', type: 'key', columns: ['resourceId'], orders: ['ASC'] },
        { key: 'index_2', type: 'key', columns: ['userId'], orders: ['ASC'] },
      ],
    },
    {
      id: COLLECTION_IDS.keys,
      name: 'Keys',
      permissions: SERVER_ONLY_PERMS,
      rowSecurity: false,
      attributes: [
        { key: 'userId', type: 'string', size: 512, required: true, array: false, default: null },
        { key: 'userName', type: 'string', size: 512, required: true, array: false, default: null },
        { key: 'name', type: 'string', size: 128, required: true, array: false, default: null },
        // Public lookup prefix (e.g. rfk_a1b2c3d4). Full secret stored encrypted below.
        { key: 'prefix', type: 'string', size: 64, required: true, array: false, default: null },
        {
          key: 'secret',
          type: 'string',
          size: 255,
          required: true,
          array: false,
          default: null,
          encrypt: true,
        },
        { key: 'lastUsedAt', type: 'datetime', required: false, array: false, default: null },
      ],
      indexes: [
        { key: 'index_userId', type: 'key', columns: ['userId'], orders: ['ASC'] },
        { key: 'uniq_prefix', type: 'unique', columns: ['prefix'], orders: ['ASC'] },
      ],
    },
    {
      id: COLLECTION_IDS.daily_topics,
      name: 'Daily topics',
      permissions: PUBLIC_READ_PERMS,
      rowSecurity: false,
      attributes: [
        { key: 'date', type: 'string', size: 32, required: true, array: false, default: null },
        { key: 'topicKey', type: 'string', size: 128, required: true, array: false, default: null },
        { key: 'topicLabel', type: 'string', size: 512, required: true, array: false, default: null },
        { key: 'totalScore', type: 'integer', required: true, array: false, default: null },
        { key: 'articleCount', type: 'integer', required: true, array: false, default: null },
        { key: 'rank', type: 'integer', required: true, array: false, default: null },
        { key: 'computedAt', type: 'datetime', required: true, array: false, default: null },
      ],
      indexes: [
        { key: 'index_date', type: 'key', columns: ['date'], orders: ['ASC'] },
        { key: 'index_date_rank', type: 'key', columns: ['date', 'rank'], orders: ['ASC', 'ASC'] },
      ],
    },
    {
      id: COLLECTION_IDS.topics,
      name: 'Topics',
      permissions: PUBLIC_READ_PERMS,
      rowSecurity: false,
      attributes: [
        { key: 'topicKey', type: 'string', size: 128, required: true, array: false, default: null },
        { key: 'topicLabel', type: 'string', size: 512, required: true, array: false, default: null },
        { key: 'totalScore', type: 'integer', required: true, array: false, default: null },
        { key: 'articleCount', type: 'integer', required: true, array: false, default: null },
        { key: 'lastComputedAt', type: 'datetime', required: true, array: false, default: null },
      ],
      indexes: [{ key: 'uniq_topicKey', type: 'unique', columns: ['topicKey'], orders: ['ASC'] }],
    },
    {
      id: COLLECTION_IDS.channels,
      name: 'Channels',
      permissions: PUBLIC_READ_PERMS,
      rowSecurity: false,
      attributes: [
        { key: 'name', type: 'string', size: 128, required: true, array: false, default: null },
        // Directory section ("Languages", "Platforms", "Topics"); ordered by first position.
        { key: 'category', type: 'string', size: 32, required: false, array: false, default: null },
        { key: 'glyph', type: 'string', size: 8, required: false, array: false, default: null },
        { key: 'color', type: 'string', size: 16, required: false, array: false, default: null },
        // File ID of the channel's PNG icon in the channel-icons bucket.
        { key: 'icon', type: 'string', size: 64, required: false, array: false, default: null },
        { key: 'description', type: 'string', size: 512, required: false, array: false, default: null },
        { key: 'keywords', type: 'string', size: 128, required: false, array: true, default: null },
        // Official feeds (RSS/Atom) are preferred; community feeds fill quiet periods.
        { key: 'sources', type: 'string', size: 2048, required: false, array: true, default: null },
        { key: 'communitySources', type: 'string', size: 2048, required: false, array: true, default: null },
        { key: 'memberCount', type: 'integer', required: false, array: false, default: 0 },
        { key: 'position', type: 'integer', required: false, array: false, default: 0 },
      ],
      indexes: [{ key: 'index_position', type: 'key', columns: ['position'], orders: ['ASC'] }],
    },
    {
      id: COLLECTION_IDS.channel_members,
      name: 'Channel members',
      permissions: SERVER_ONLY_PERMS,
      rowSecurity: false,
      attributes: [
        { key: 'userId', type: 'string', size: 512, required: true, array: false, default: null },
        { key: 'channelId', type: 'string', size: 64, required: true, array: false, default: null },
      ],
      indexes: [
        { key: 'index_userId', type: 'key', columns: ['userId'], orders: ['ASC'] },
        { key: 'index_channelId', type: 'key', columns: ['channelId'], orders: ['ASC'] },
        { key: 'uniq_member', type: 'unique', columns: ['userId', 'channelId'], orders: ['ASC', 'ASC'] },
      ],
    },
    // Public profiles (row ID = user ID), written by the web app on sign-in.
    {
      id: COLLECTION_IDS.profiles,
      name: 'Profiles',
      permissions: SERVER_ONLY_PERMS,
      rowSecurity: false,
      attributes: [
        { key: 'name', type: 'string', size: 128, required: true, array: false, default: null },
        { key: 'bio', type: 'string', size: 280, required: false, array: false, default: null },
        { key: 'website', type: 'string', size: 256, required: false, array: false, default: null },
        // 'everyone' | 'nobody': who may start a conversation with this person.
        { key: 'allowMessages', type: 'string', size: 16, required: false, array: false, default: 'everyone' },
        { key: 'joinedAt', type: 'datetime', required: false, array: false, default: null },
        // Email about replies and new followers (sent with Appwrite Messaging).
        { key: 'emailNotifications', type: 'boolean', required: false, array: false, default: true },
      ],
      indexes: [
        { key: 'index_name', type: 'fulltext', columns: ['name'], orders: undefined },
        { key: 'index_allowMessages', type: 'key', columns: ['allowMessages'], orders: ['ASC'] },
      ],
    },
    {
      id: COLLECTION_IDS.user_blocks,
      name: 'User blocks',
      permissions: SERVER_ONLY_PERMS,
      rowSecurity: false,
      attributes: [
        { key: 'userId', type: 'string', size: 64, required: true, array: false, default: null },
        { key: 'blockedUserId', type: 'string', size: 64, required: true, array: false, default: null },
      ],
      indexes: [
        { key: 'uniq_block', type: 'unique', columns: ['userId', 'blockedUserId'], orders: ['ASC', 'ASC'] },
        { key: 'index_blockedUserId', type: 'key', columns: ['blockedUserId'], orders: ['ASC'] },
      ],
    },
    {
      id: COLLECTION_IDS.user_follows,
      name: 'User follows',
      permissions: SERVER_ONLY_PERMS,
      rowSecurity: false,
      attributes: [
        { key: 'followerId', type: 'string', size: 64, required: true, array: false, default: null },
        { key: 'userId', type: 'string', size: 64, required: true, array: false, default: null },
      ],
      indexes: [
        { key: 'uniq_follow', type: 'unique', columns: ['followerId', 'userId'], orders: ['ASC', 'ASC'] },
        { key: 'index_userId', type: 'key', columns: ['userId'], orders: ['ASC'] },
      ],
    },
    // Direct messages and group conversations.
    {
      id: COLLECTION_IDS.conversations,
      name: 'Conversations',
      permissions: SERVER_ONLY_PERMS,
      rowSecurity: false,
      attributes: [
        { key: 'type', type: 'string', size: 16, required: true, array: false, default: null },
        { key: 'name', type: 'string', size: 80, required: false, array: false, default: null },
        { key: 'createdBy', type: 'string', size: 64, required: true, array: false, default: null },
        // Sorted "userA:userB" for direct conversations, so each pair has one.
        { key: 'directKey', type: 'string', size: 160, required: false, array: false, default: null },
        { key: 'memberCount', type: 'integer', required: false, array: false, default: 0 },
        { key: 'lastMessageAt', type: 'datetime', required: false, array: false, default: null },
        { key: 'lastMessageId', type: 'string', size: 64, required: false, array: false, default: null },
        { key: 'lastMessagePreview', type: 'string', size: 200, required: false, array: false, default: null },
        { key: 'lastMessageUserId', type: 'string', size: 64, required: false, array: false, default: null },
      ],
      indexes: [
        { key: 'uniq_directKey', type: 'unique', columns: ['directKey'], orders: ['ASC'] },
        { key: 'index_createdBy', type: 'key', columns: ['createdBy'], orders: ['ASC'] },
      ],
    },
    {
      id: COLLECTION_IDS.conversation_members,
      name: 'Conversation members',
      permissions: SERVER_ONLY_PERMS,
      rowSecurity: false,
      attributes: [
        { key: 'conversationId', type: 'string', size: 64, required: true, array: false, default: null },
        { key: 'userId', type: 'string', size: 64, required: true, array: false, default: null },
        { key: 'role', type: 'string', size: 16, required: false, array: false, default: 'member' },
        // Denormalized from the conversation so the inbox is one ordered query.
        { key: 'lastMessageAt', type: 'datetime', required: false, array: false, default: null },
        { key: 'lastReadAt', type: 'datetime', required: false, array: false, default: null },
        { key: 'unreadCount', type: 'integer', required: false, array: false, default: 0 },
        { key: 'muted', type: 'boolean', required: false, array: false, default: false },
      ],
      indexes: [
        { key: 'uniq_conversation_user', type: 'unique', columns: ['conversationId', 'userId'], orders: ['ASC', 'ASC'] },
        { key: 'index_user_lastMessageAt', type: 'key', columns: ['userId', 'lastMessageAt'], orders: ['ASC', 'DESC'] },
        { key: 'index_user_unread', type: 'key', columns: ['userId', 'unreadCount'], orders: ['ASC', 'ASC'] },
      ],
    },
    {
      id: COLLECTION_IDS.messages,
      name: 'Messages',
      permissions: SERVER_ONLY_PERMS,
      rowSecurity: false,
      attributes: [
        { key: 'conversationId', type: 'string', size: 64, required: true, array: false, default: null },
        { key: 'userId', type: 'string', size: 64, required: true, array: false, default: null },
        // 'text' | 'system' (group events such as "Ada added Grace").
        { key: 'kind', type: 'string', size: 16, required: false, array: false, default: 'text' },
        { key: 'content', type: 'string', size: 4000, required: false, array: false, default: null },
        { key: 'replyToId', type: 'string', size: 64, required: false, array: false, default: null },
        // A shared story (posts row ID).
        { key: 'postId', type: 'string', size: 64, required: false, array: false, default: null },
        { key: 'editedAt', type: 'datetime', required: false, array: false, default: null },
        { key: 'deleted', type: 'boolean', required: false, array: false, default: false },
      ],
      indexes: [
        { key: 'index_conversationId', type: 'key', columns: ['conversationId'], orders: ['ASC'] },
        { key: 'index_userId', type: 'key', columns: ['userId'], orders: ['ASC'] },
      ],
    },
    {
      id: COLLECTION_IDS.message_reactions,
      name: 'Message reactions',
      permissions: SERVER_ONLY_PERMS,
      rowSecurity: false,
      attributes: [
        { key: 'messageId', type: 'string', size: 64, required: true, array: false, default: null },
        { key: 'conversationId', type: 'string', size: 64, required: true, array: false, default: null },
        { key: 'userId', type: 'string', size: 64, required: true, array: false, default: null },
        { key: 'emoji', type: 'string', size: 16, required: true, array: false, default: null },
      ],
      indexes: [
        { key: 'uniq_reaction', type: 'unique', columns: ['messageId', 'userId', 'emoji'], orders: ['ASC', 'ASC', 'ASC'] },
        { key: 'index_messageId', type: 'key', columns: ['messageId'], orders: ['ASC'] },
      ],
    },
    // Activity for the bell: replies, comments on your stories, follows and milestones.
    {
      id: COLLECTION_IDS.notifications,
      name: 'Notifications',
      permissions: SERVER_ONLY_PERMS,
      rowSecurity: false,
      attributes: [
        { key: 'userId', type: 'string', size: 64, required: true, array: false, default: null },
        // 'comment' | 'reply' | 'follow' | 'milestone'
        { key: 'type', type: 'string', size: 16, required: true, array: false, default: null },
        { key: 'actorId', type: 'string', size: 64, required: false, array: false, default: null },
        { key: 'actorName', type: 'string', size: 128, required: false, array: false, default: null },
        { key: 'postId', type: 'string', size: 64, required: false, array: false, default: null },
        { key: 'postTitle', type: 'string', size: 300, required: false, array: false, default: null },
        { key: 'commentId', type: 'string', size: 64, required: false, array: false, default: null },
        { key: 'preview', type: 'string', size: 280, required: false, array: false, default: null },
        { key: 'read', type: 'boolean', required: false, array: false, default: false },
      ],
      indexes: [
        { key: 'index_userId', type: 'key', columns: ['userId'], orders: ['ASC'] },
        { key: 'index_user_read', type: 'key', columns: ['userId', 'read'], orders: ['ASC', 'ASC'] },
      ],
    },
    // Stories people saved to read later.
    {
      id: COLLECTION_IDS.saves,
      name: 'Saves',
      permissions: SERVER_ONLY_PERMS,
      rowSecurity: false,
      attributes: [
        { key: 'userId', type: 'string', size: 64, required: true, array: false, default: null },
        { key: 'postId', type: 'string', size: 64, required: true, array: false, default: null },
      ],
      indexes: [
        { key: 'uniq_save', type: 'unique', columns: ['userId', 'postId'], orders: ['ASC', 'ASC'] },
        { key: 'index_postId', type: 'key', columns: ['postId'], orders: ['ASC'] },
      ],
    },
    // Reported stories and comments, reviewed by moderators.
    {
      id: COLLECTION_IDS.reports,
      name: 'Reports',
      permissions: SERVER_ONLY_PERMS,
      rowSecurity: false,
      attributes: [
        { key: 'reporterId', type: 'string', size: 64, required: true, array: false, default: null },
        // 'post' | 'comment'
        { key: 'resourceType', type: 'string', size: 16, required: true, array: false, default: null },
        { key: 'resourceId', type: 'string', size: 64, required: true, array: false, default: null },
        { key: 'postId', type: 'string', size: 64, required: false, array: false, default: null },
        // 'spam' | 'offtopic' | 'abuse' | 'misleading' | 'other'
        { key: 'reason', type: 'string', size: 32, required: true, array: false, default: null },
        { key: 'note', type: 'string', size: 500, required: false, array: false, default: null },
        // 'open' | 'dismissed' | 'removed'
        { key: 'status', type: 'string', size: 16, required: false, array: false, default: 'open' },
        { key: 'resolvedBy', type: 'string', size: 64, required: false, array: false, default: null },
      ],
      indexes: [
        {
          key: 'uniq_report',
          type: 'unique',
          columns: ['reporterId', 'resourceType', 'resourceId'],
          orders: ['ASC', 'ASC', 'ASC'],
        },
        { key: 'index_status', type: 'key', columns: ['status'], orders: ['ASC'] },
        { key: 'index_resourceId', type: 'key', columns: ['resourceId'], orders: ['ASC'] },
      ],
    },
  ];
}

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * Upload scripts/channel-icons/<id>.png when it changed. File IDs carry a content hash, so a new
 * icon gets a new URL (no stale caches) and the previous file is removed. Returns the file ID, or
 * undefined when there is no local icon (the row's current icon is then left alone).
 */
async function ensureChannelIcon(storage, channel, previousIcon) {
  const path = resolve(SCRIPTS_DIR, 'channel-icons', `${channel.id}.png`);
  if (!existsSync(path)) return undefined;
  const hash = createHash('md5').update(readFileSync(path)).digest('hex').slice(0, 8);
  const fileId = `${channel.id.slice(0, 27)}-${hash}`;
  if (fileId === previousIcon) return fileId;
  try {
    await storage.getFile({ bucketId: CHANNEL_ICONS_BUCKET_ID, fileId });
  } catch (error) {
    if (error.code !== 404) throw error;
    await storage.createFile({
      bucketId: CHANNEL_ICONS_BUCKET_ID,
      fileId,
      file: InputFile.fromPath(path, `${channel.id}.png`),
    });
    log(`  Icon for "${channel.name}" uploaded`, 'success');
  }
  if (previousIcon) {
    await storage.deleteFile({ bucketId: CHANNEL_ICONS_BUCKET_ID, fileId: previousIcon }).catch(() => {});
  }
  return fileId;
}

/** Upsert the channel catalog (and icons) without touching member counts. */
async function ensureChannels(tablesDB, storage) {
  const file = resolve(SCRIPTS_DIR, 'channels.json');
  const channels = JSON.parse(readFileSync(file, 'utf8'));
  for (const [position, channel] of channels.entries()) {
    let existing = null;
    try {
      existing = await tablesDB.getRow(APPWRITE_DATABASE_ID, COLLECTION_IDS.channels, channel.id);
    } catch (error) {
      if (error.code !== 404) throw error;
    }
    const icon = await ensureChannelIcon(storage, channel, existing?.icon ?? null);
    const data = {
      name: channel.name,
      category: channel.category ?? null,
      glyph: channel.glyph,
      color: channel.color,
      description: channel.description,
      keywords: channel.keywords ?? [],
      sources: channel.sources ?? [],
      communitySources: channel.communitySources ?? [],
      position,
      ...(icon ? { icon } : {}),
    };
    if (existing) {
      await tablesDB.updateRow(APPWRITE_DATABASE_ID, COLLECTION_IDS.channels, channel.id, data);
      log(`  Channel "${channel.name}" updated`, 'success');
    } else {
      await tablesDB.createRow(APPWRITE_DATABASE_ID, COLLECTION_IDS.channels, channel.id, {
        ...data,
        memberCount: 0,
      });
      log(`  Channel "${channel.name}" created`, 'success');
    }
  }
}

const CHANNEL_ICONS_BUCKET_ID = process.env.APPWRITE_CHANNEL_ICONS_BUCKET_ID || 'channel-icons';

/** Storage buckets (extend as needed). */
const STORAGE_BUCKETS = {
  [CHANNEL_ICONS_BUCKET_ID]: {
    name: 'Channel icons',
    // Icons are public images; uploads happen with an API key (setup script or Console).
    permissions: [Permission.read(Role.any())],
    fileSecurity: false,
    maxFileSize: 1_000_000,
    allowedFileExtensions: ['png'],
  },
};

const DB_SCOPES = [
  'databases.read',
  'databases.write',
  'tables.read',
  'tables.write',
  'columns.read',
  'columns.write',
  'indexes.read',
  'indexes.write',
  'rows.read',
  'rows.write',
  'users.read',
];

function refetchFunctionDefinitions() {
  return [
    {
      folder: 'scout',
      name: 'Scout',
      runtime: Runtime.Node180,
      timeout: 900,
      entrypoint: 'index.js',
      commands: 'npm install',
      scopes: DB_SCOPES,
    },
    {
      folder: 'enhancement',
      name: 'Enhancement',
      runtime: Runtime.Node180,
      timeout: 900,
      entrypoint: 'index.js',
      commands: 'npm install',
      scopes: DB_SCOPES,
    },
    {
      folder: 'algorithm',
      name: 'Algorithm',
      runtime: Runtime.Node180,
      timeout: 900,
      entrypoint: 'index.js',
      commands: 'npm install',
      scopes: DB_SCOPES,
    },
    {
      folder: 'channels',
      name: 'Channels',
      runtime: Runtime.Node22,
      timeout: 600,
      entrypoint: 'index.js',
      commands: 'npm install',
      scopes: ['databases.read', 'tables.read', 'rows.read', 'rows.write'],
      schedule: '15 */2 * * *',
      execute: [], // scheduled only; nobody can trigger it from outside
    },
    {
      folder: 'topic-stats',
      name: 'Topic stats',
      runtime: Runtime.Node180,
      timeout: 900,
      entrypoint: 'index.js',
      commands: 'npm install',
      scopes: DB_SCOPES,
    },
  ];
}

async function ensureDatabase(tablesDB) {
  try {
    await tablesDB.get(APPWRITE_DATABASE_ID);
    log(`Database ${APPWRITE_DATABASE_ID} exists`, 'success');
  } catch (error) {
    if (error.code === 404) {
      log(`Creating database ${APPWRITE_DATABASE_ID}…`, 'info');
      await tablesDB.create(APPWRITE_DATABASE_ID, APPWRITE_DATABASE_ID, true);
      log('Database created', 'success');
    } else {
      throw error;
    }
  }
}

async function ensureTable(tablesDB, tableId, config) {
  try {
    const table = await tablesDB.getTable(APPWRITE_DATABASE_ID, tableId);
    log(`Table "${config.name}" (${tableId}) exists`, 'success');
    // Keep permissions in step with the definitions, so tightening them here
    // also locks down tables created by an earlier run.
    const wanted = [...config.permissions].sort();
    const current = [...table.$permissions].sort();
    const rowSecurity = config.rowSecurity ?? false;
    if (wanted.join('\n') !== current.join('\n') || table.rowSecurity !== rowSecurity) {
      log(`  Updating permissions on "${config.name}"…`, 'info');
      return tablesDB.updateTable(
        APPWRITE_DATABASE_ID,
        tableId,
        table.name,
        config.permissions,
        rowSecurity,
        table.enabled
      );
    }
    return table;
  } catch (error) {
    if (error.code === 404) {
      log(`Creating table "${config.name}" (${tableId})…`, 'info');
      return tablesDB.createTable(
        APPWRITE_DATABASE_ID,
        tableId,
        config.name,
        config.permissions,
        config.rowSecurity ?? false,
        true
      );
    }
    throw error;
  }
}

async function ensureColumn(tablesDB, tableId, attribute) {
  try {
    await tablesDB.getColumn(APPWRITE_DATABASE_ID, tableId, attribute.key);
    log(`  Column "${attribute.key}" ok`, 'success');
  } catch (error) {
    if (error.code !== 404) throw error;
    log(`  Creating column "${attribute.key}"…`, 'info');
    const { key, type, required, array } = attribute;
    const def = undef(attribute.default);
    const encrypt = attribute.encrypt === true;

    switch (type) {
      case 'string':
        await tablesDB.createStringColumn(
          APPWRITE_DATABASE_ID,
          tableId,
          key,
          attribute.size,
          required,
          def,
          array ?? false,
          encrypt || false
        );
        break;
      case 'integer':
        await tablesDB.createIntegerColumn(
          APPWRITE_DATABASE_ID,
          tableId,
          key,
          required,
          undef(attribute.min),
          undef(attribute.max),
          def,
          array ?? false
        );
        break;
      case 'boolean':
        await tablesDB.createBooleanColumn(APPWRITE_DATABASE_ID, tableId, key, required, def, array ?? false);
        break;
      case 'datetime':
        await tablesDB.createDatetimeColumn(APPWRITE_DATABASE_ID, tableId, key, required, def, array ?? false);
        break;
      case 'float':
        await tablesDB.createFloatColumn(
          APPWRITE_DATABASE_ID,
          tableId,
          key,
          required,
          undef(attribute.min),
          undef(attribute.max),
          def,
          array ?? false
        );
        break;
      default:
        throw new Error(`Unsupported column type: ${type}`);
    }
    await waitForColumn(tablesDB, APPWRITE_DATABASE_ID, tableId, key);
    log(`  Column "${attribute.key}" ready`, 'success');
  }
}

async function ensureIndex(tablesDB, tableId, index) {
  try {
    await tablesDB.getIndex(APPWRITE_DATABASE_ID, tableId, index.key);
    log(`  Index "${index.key}" ok`, 'success');
  } catch (error) {
    if (error.code !== 404) throw error;
    log(`  Creating index "${index.key}"…`, 'info');
    await tablesDB.createIndex(
      APPWRITE_DATABASE_ID,
      tableId,
      index.key,
      index.type,
      index.columns,
      index.orders,
      index.lengths
    );
    await waitForIndex(tablesDB, APPWRITE_DATABASE_ID, tableId, index.key);
    log(`  Index "${index.key}" ready`, 'success');
  }
}

async function ensureStorageBucket(storage, bucketId, config) {
  try {
    await storage.getBucket(bucketId);
    log(`Bucket "${config.name}" exists`, 'success');
  } catch (error) {
    if (error.code !== 404) throw error;
    log(`Creating bucket "${config.name}"…`, 'info');
    await storage.createBucket(
      bucketId,
      config.name,
      config.permissions ?? [],
      config.fileSecurity ?? true,
      true,
      config.maxFileSize ?? 30_000_000,
      config.allowedFileExtensions ?? [],
      config.compression ?? Compression.None,
      config.encryption ?? false,
      config.antivirus ?? true
    );
    log(`Bucket "${config.name}" created`, 'success');
  }
}

/** Resolve by Appwrite function display name (server-side filter: Query.equal on `name`). */
async function findFunctionByExactName(functions, displayName) {
  const res = await functions.list([
    Query.equal('name', displayName),
    Query.limit(2),
  ]);
  const items = res.functions ?? [];
  if (items.length > 1) {
    log(
      `Multiple functions named "${displayName}" (${items.length}); using ${items[0].$id}`,
      'warning'
    );
  }
  return items[0] ?? null;
}

async function ensureFunction(functions, def) {
  const existing = await findFunctionByExactName(functions, def.name);
  if (existing) {
    log(`Function "${def.name}" (${existing.$id}) exists`, 'success');
    return existing;
  }

  const functionId = ID.unique();
  log(`Creating function "${def.name}" (${functionId})…`, 'info');
  try {
    return await functions.create(
      functionId,
      def.name,
      def.runtime,
      def.execute ?? ['any'],
      [],
      def.schedule,
      def.timeout ?? 300,
      true,
      true,
      def.entrypoint,
      def.commands,
      def.scopes,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );
  } catch (createErr) {
    if (createErr.code === 409) {
      const again = await findFunctionByExactName(functions, def.name);
      if (again) {
        log(`Function "${def.name}" already exists (409). Using ${again.$id}.`, 'success');
        return again;
      }
    }
    throw createErr;
  }
}

export async function setupAppwrite() {
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !APPWRITE_DATABASE_ID) {
    log(
      'Missing Appwrite config. Set endpoint (APPWRITE_ENDPOINT | NEXT_PUBLIC_APPWRITE_ENDPOINT), ' +
        'project (APPWRITE_PROJECT_ID | NEXT_PUBLIC_APPWRITE_PROJECT_ID), ' +
        'APPWRITE_API_KEY, and APPWRITE_DATABASE_ID',
      'error'
    );
    process.exit(1);
  }

  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const tablesDB = new TablesDB(client);
  const storage = new Storage(client);
  const functions = new Functions(client);

  log('Starting Refetch Appwrite setup…', 'info');

  await ensureDatabase(tablesDB);

  const collections = buildCollectionDefinitions();
  for (const col of collections) {
    log(`\nTable ${col.name} (${col.id})`, 'info');
    await ensureTable(tablesDB, col.id, col);
    for (const attr of col.attributes) {
      await ensureColumn(tablesDB, col.id, attr);
    }
    for (const idx of col.indexes) {
      await ensureIndex(tablesDB, col.id, idx);
    }
  }

  if (Object.keys(STORAGE_BUCKETS).length) {
    log('\nStorage buckets', 'info');
    for (const [bucketId, cfg] of Object.entries(STORAGE_BUCKETS)) {
      await ensureStorageBucket(storage, bucketId, cfg);
    }
  }

  log('\nChannels', 'info');
  await ensureChannels(tablesDB, storage);

  log('\nFunctions', 'info');
  for (const fnDef of refetchFunctionDefinitions()) {
    log(`\n${fnDef.name}`, 'info');
    await ensureFunction(functions, fnDef);
  }

  log('\nDone. Table IDs for .env (APPWRITE_*_COLLECTION_ID):', 'success');
  log(`  APPWRITE_POSTS_COLLECTION_ID=${COLLECTION_IDS.posts}`, 'info');
  log(`  APPWRITE_COMMENTS_COLLECTION_ID=${COLLECTION_IDS.comments}`, 'info');
  log(`  APPWRITE_VOTES_COLLECTION_ID=${COLLECTION_IDS.votes}`, 'info');
  log(`  APPWRITE_KEYS_COLLECTION_ID=${COLLECTION_IDS.keys}`, 'info');
  log(`  APPWRITE_DAILY_TOPICS_COLLECTION_ID=${COLLECTION_IDS.daily_topics}`, 'info');
  log(`  APPWRITE_TOPICS_COLLECTION_ID=${COLLECTION_IDS.topics}`, 'info');
  log(`  APPWRITE_CHANNELS_COLLECTION_ID=${COLLECTION_IDS.channels}`, 'info');
  log(`  APPWRITE_CHANNEL_MEMBERS_COLLECTION_ID=${COLLECTION_IDS.channel_members}`, 'info');
  log(`  APPWRITE_CHANNEL_ICONS_BUCKET_ID=${CHANNEL_ICONS_BUCKET_ID}`, 'info');
  log(`  APPWRITE_PROFILES_COLLECTION_ID=${COLLECTION_IDS.profiles}`, 'info');
  log(`  APPWRITE_BLOCKS_COLLECTION_ID=${COLLECTION_IDS.user_blocks}`, 'info');
  log(`  APPWRITE_FOLLOWS_COLLECTION_ID=${COLLECTION_IDS.user_follows}`, 'info');
  log(`  APPWRITE_CONVERSATIONS_COLLECTION_ID=${COLLECTION_IDS.conversations}`, 'info');
  log(`  APPWRITE_CONVERSATION_MEMBERS_COLLECTION_ID=${COLLECTION_IDS.conversation_members}`, 'info');
  log(`  APPWRITE_MESSAGES_COLLECTION_ID=${COLLECTION_IDS.messages}`, 'info');
  log(`  APPWRITE_MESSAGE_REACTIONS_COLLECTION_ID=${COLLECTION_IDS.message_reactions}`, 'info');
  log(`  APPWRITE_NOTIFICATIONS_COLLECTION_ID=${COLLECTION_IDS.notifications}`, 'info');
  log(`  APPWRITE_SAVES_COLLECTION_ID=${COLLECTION_IDS.saves}`, 'info');
  log(`  APPWRITE_REPORTS_COLLECTION_ID=${COLLECTION_IDS.reports}`, 'info');
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  setupAppwrite().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
