/**
 * Refetch Appwrite bootstrap (tables, columns, indexes, optional functions & buckets).
 *
 * Required (any one name per row is enough):
 *   API endpoint: APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_ENDPOINT, or APPWRITE_SITE_API_ENDPOINT (Sites)
 *   Project ID: APPWRITE_PROJECT_ID, NEXT_PUBLIC_APPWRITE_PROJECT_ID, or APPWRITE_SITE_PROJECT_ID (Sites)
 *   APPWRITE_API_KEY
 *   APPWRITE_DATABASE_ID
 *
 * Table IDs default to human-readable slugs; override with env to attach to an existing project
 * (env vars still use *_COLLECTION_ID for backward compatibility):
 *   APPWRITE_POSTS_COLLECTION_ID, APPWRITE_COMMENTS_COLLECTION_ID, APPWRITE_VOTES_COLLECTION_ID,
 *   APPWRITE_DAILY_TOPICS_COLLECTION_ID, APPWRITE_TOPICS_COLLECTION_ID
 *
 * Optional:
 *   APPWRITE_DATABASE_NAME (default: Refetch)
 *   SKIP_APPWRITE_SETUP=1 — no-op (use for CI/build when Appwrite bootstrap should not run)
 *   APPWRITE_SETUP_DEPLOY_FUNCTIONS=1 — upload tar.gz deployments for functions that have none
 *   APPWRITE_SETUP_FORCE_DEPLOY=1 — create a new deployment even if one exists (implies DEPLOY)
 *
 * Functions: matched by display name (must match the Appwrite Console function name exactly).
 *   On first run a new function id is generated; no APPWRITE_FUNCTION_*_ID list is required.
 *
 * Function env sync: each variable value is capped at 8192 characters (Appwrite limit). Long values
 * (e.g. TARGET_WEBSITES) are skipped with a warning — configure those in the Appwrite Console.
 *
 * Index note: UTF-8 index byte limit (~767). Full-text on long string columns uses lengths: [191, …].
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const FUNCTIONS_ROOT = join(REPO_ROOT, 'functions');

const APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT ||
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  process.env.APPWRITE_SITE_API_ENDPOINT ||
  '';
const APPWRITE_PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  process.env.APPWRITE_SITE_PROJECT_ID ||
  '';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || '';
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '';
const DATABASE_NAME = process.env.APPWRITE_DATABASE_NAME || 'Refetch';

const COLLECTION_IDS = {
  posts: process.env.APPWRITE_POSTS_COLLECTION_ID || 'posts',
  comments: process.env.APPWRITE_COMMENTS_COLLECTION_ID || 'comments',
  votes: process.env.APPWRITE_VOTES_COLLECTION_ID || 'votes',
  daily_topics: process.env.APPWRITE_DAILY_TOPICS_COLLECTION_ID || 'daily_topics',
  topics: process.env.APPWRITE_TOPICS_COLLECTION_ID || 'topics',
};

const DEFAULT_PERMS = [
  Permission.read(Role.any()),
  Permission.create(Role.users()),
  Permission.update(Role.users()),
  Permission.delete(Role.users()),
];

const STATS_PERMS = [Permission.read(Role.any())];

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
      permissions: DEFAULT_PERMS,
      rowSecurity: false,
      // Mirrors Appwrite console: title/userId/userName required; topics = string[] with 256 chars per element;
      // translations stored as JSON strings (see enhancement function).
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
        { key: 'titleTranslations', type: 'string', size: 100000, required: false, array: false, default: null },
        { key: 'descriptionTranslations', type: 'string', size: 100000, required: false, array: false, default: null },
        { key: 'countComments', type: 'integer', required: false, array: false, default: null },
        { key: 'tldr', type: 'string', size: 100000, required: false, array: false, default: null },
        { key: 'timeScore', type: 'integer', required: false, array: false, default: null },
        { key: 'score', type: 'integer', required: false, array: false, default: null },
        { key: 'sensationScore', type: 'integer', required: false, array: false, default: null },
        { key: 'diversityScore', type: 'integer', required: false, array: false, default: null },
        { key: 'relevancyScore', type: 'integer', required: false, array: false, default: null },
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
      ],
    },
    {
      id: COLLECTION_IDS.comments,
      name: 'Comments',
      permissions: DEFAULT_PERMS,
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
      permissions: DEFAULT_PERMS,
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
      id: COLLECTION_IDS.daily_topics,
      name: 'Daily topics',
      permissions: STATS_PERMS,
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
      permissions: STATS_PERMS,
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
  ];
}

/** Optional storage buckets (extend as needed). */
const STORAGE_BUCKETS = {};

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
  const endpoint = APPWRITE_ENDPOINT;
  const project = APPWRITE_PROJECT_ID;
  const posts = COLLECTION_IDS.posts;
  const comments = COLLECTION_IDS.comments;
  const votes = COLLECTION_IDS.votes;
  const dailyTopics = COLLECTION_IDS.daily_topics;
  const topics = COLLECTION_IDS.topics;

  const common = {
    APPWRITE_ENDPOINT: endpoint,
    APPWRITE_PROJECT_ID: project,
    NEXT_PUBLIC_APPWRITE_ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || endpoint,
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || project,
    APPWRITE_API_KEY: process.env.APPWRITE_API_KEY || '',
    APPWRITE_DATABASE_ID: APPWRITE_DATABASE_ID,
    APPWRITE_POSTS_COLLECTION_ID: posts,
    APPWRITE_COMMENTS_COLLECTION_ID: comments,
    APPWRITE_VOTES_COLLECTION_ID: votes,
  };

  return [
    {
      folder: 'scout',
      name: 'Scout',
      runtime: Runtime.Node180,
      timeout: 900,
      entrypoint: 'index.js',
      commands: 'npm install',
      scopes: DB_SCOPES,
      variables: {
        ...common,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
        SCOUT_USER_ID: process.env.SCOUT_USER_ID || '',
        SCOUT_USER_NAME: process.env.SCOUT_USER_NAME || 'Scout',
        TARGET_WEBSITES: process.env.TARGET_WEBSITES || '',
      },
      variableSecrets: ['OPENAI_API_KEY', 'APPWRITE_API_KEY'],
    },
    {
      folder: 'enhancement',
      name: 'Enhancement',
      runtime: Runtime.Node180,
      timeout: 900,
      entrypoint: 'index.js',
      commands: 'npm install',
      scopes: DB_SCOPES,
      variables: {
        ...common,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      },
      variableSecrets: ['OPENAI_API_KEY', 'APPWRITE_API_KEY'],
    },
    {
      folder: 'algorithm',
      name: 'Algorithm',
      runtime: Runtime.Node180,
      timeout: 900,
      entrypoint: 'index.js',
      commands: 'npm install',
      scopes: DB_SCOPES,
      variables: { ...common },
      variableSecrets: ['APPWRITE_API_KEY'],
    },
    {
      folder: 'readme',
      name: 'Readme',
      runtime: Runtime.Node180,
      timeout: 300,
      entrypoint: 'index.js',
      commands: 'npm install',
      scopes: ['databases.read', 'tables.read', 'rows.read'],
      variables: {
        APPWRITE_ENDPOINT: endpoint,
        APPWRITE_PROJECT_ID: project,
        APPWRITE_API_KEY: process.env.APPWRITE_API_KEY || '',
        APPWRITE_DATABASE_ID: APPWRITE_DATABASE_ID,
        APPWRITE_POSTS_COLLECTION_ID: posts,
        GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
        GITHUB_OWNER: process.env.GITHUB_OWNER || '',
        GITHUB_REPO: process.env.GITHUB_REPO || '',
        GITHUB_BRANCH: process.env.GITHUB_BRANCH || 'main',
        APP_BASE_URL: process.env.APP_BASE_URL || 'https://refetch.io',
      },
      variableSecrets: ['APPWRITE_API_KEY', 'GITHUB_TOKEN'],
    },
    {
      folder: 'topic-stats',
      name: 'Topic stats',
      runtime: Runtime.Node180,
      timeout: 900,
      entrypoint: 'index.js',
      commands: 'npm install',
      scopes: DB_SCOPES,
      variables: {
        ...common,
        APPWRITE_DAILY_TOPICS_COLLECTION_ID: dailyTopics,
        APPWRITE_TOPICS_COLLECTION_ID: topics,
      },
      variableSecrets: ['APPWRITE_API_KEY'],
    },
  ];
}

async function ensureDatabase(tablesDB) {
  try {
    await tablesDB.get(APPWRITE_DATABASE_ID);
    log(`Database "${DATABASE_NAME}" (${APPWRITE_DATABASE_ID}) exists`, 'success');
  } catch (error) {
    if (error.code === 404) {
      log(`Creating database "${DATABASE_NAME}"…`, 'info');
      await tablesDB.create(APPWRITE_DATABASE_ID, DATABASE_NAME, true);
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

/** Appwrite function / site variable value limit (chars). */
const MAX_FUNCTION_VAR_VALUE_LENGTH = 8192;

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
      ['any'],
      [],
      undefined,
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

async function ensureFunctionVariables(functions, def, functionId) {
  const { variables, variableSecrets = [] } = def;
  const list = await functions.listVariables(functionId);
  const existing = new Map((list.variables || []).map((v) => [v.key, v]));

  for (const [key, value] of Object.entries(variables)) {
    const secret = variableSecrets.includes(key);
    const strVal = value === undefined || value === null ? '' : String(value);
    if (strVal.length > MAX_FUNCTION_VAR_VALUE_LENGTH) {
      log(
        `    Variable "${key}" skipped (length ${strVal.length} > ${MAX_FUNCTION_VAR_VALUE_LENGTH}). ` +
          `Appwrite allows at most ${MAX_FUNCTION_VAR_VALUE_LENGTH} chars — set this key in the Appwrite Console if needed.`,
        'warning'
      );
      continue;
    }
    const prev = existing.get(key);
    if (prev) {
      await functions.updateVariable(functionId, prev.$id, key, strVal, secret);
      log(`    Variable "${key}" updated${secret ? ' (secret)' : ''}`, 'success');
    } else {
      await functions.createVariable(functionId, key, strVal, secret);
      log(`    Variable "${key}" created${secret ? ' (secret)' : ''}`, 'success');
    }
  }
}

function packFunctionFolder(folderPath, outTarGz) {
  execFileSync('tar', ['-czf', outTarGz, '-C', folderPath, '.'], { stdio: 'inherit' });
}

async function maybeDeployFunction(functions, def, functionId) {
  const deploy = process.env.APPWRITE_SETUP_DEPLOY_FUNCTIONS === '1';
  const force = process.env.APPWRITE_SETUP_FORCE_DEPLOY === '1';
  if (!deploy && !force) {
    log(`  Skipping deployment for "${def.name}" (${functionId}) (set APPWRITE_SETUP_DEPLOY_FUNCTIONS=1)`, 'info');
    return;
  }

  const list = await functions.listDeployments(functionId);
  const has = (list.deployments || []).length > 0;
  if (has && !force) {
    log(
      `  "${def.name}" (${functionId}) already has deployments; skip (APPWRITE_SETUP_FORCE_DEPLOY=1 to redeploy)`,
      'success'
    );
    return;
  }

  const folderPath = join(FUNCTIONS_ROOT, def.folder);
  if (!existsSync(join(folderPath, 'index.js'))) {
    log(`  No index.js in ${folderPath}, skip deploy`, 'warning');
    return;
  }

  const tmp = mkdtempSync(join(tmpdir(), `refetch-fn-${def.folder}-`));
  const tarGz = join(tmp, 'code.tar.gz');
  try {
    log(`  Packing & deploying "${def.name}" (${functionId})…`, 'info');
    packFunctionFolder(folderPath, tarGz);
    const input = InputFile.fromPath(tarGz, 'code.tar.gz');
    await functions.createDeployment(functionId, input, true, def.entrypoint, def.commands);
    log(`  Deployment submitted for "${def.name}" (${functionId})`, 'success');
  } finally {
    try {
      rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

export async function setupAppwrite() {
  if (process.env.SKIP_APPWRITE_SETUP === '1' || process.env.SKIP_APPWRITE_SETUP === 'true') {
    log('Skipping Appwrite setup (SKIP_APPWRITE_SETUP is set)', 'warning');
    return;
  }

  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !APPWRITE_DATABASE_ID) {
    log(
      'Missing Appwrite config. Set endpoint (APPWRITE_ENDPOINT | NEXT_PUBLIC_APPWRITE_ENDPOINT | APPWRITE_SITE_API_ENDPOINT), ' +
        'project (APPWRITE_PROJECT_ID | NEXT_PUBLIC_APPWRITE_PROJECT_ID | APPWRITE_SITE_PROJECT_ID), ' +
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

  log('\nFunctions', 'info');
  for (const fnDef of refetchFunctionDefinitions()) {
    log(`\n${fnDef.name}`, 'info');
    const fn = await ensureFunction(functions, fnDef);
    await ensureFunctionVariables(functions, fnDef, fn.$id);
    await maybeDeployFunction(functions, fnDef, fn.$id);
  }

  log('\nDone. Table IDs for .env (APPWRITE_*_COLLECTION_ID):', 'success');
  log(`  APPWRITE_POSTS_COLLECTION_ID=${COLLECTION_IDS.posts}`, 'info');
  log(`  APPWRITE_COMMENTS_COLLECTION_ID=${COLLECTION_IDS.comments}`, 'info');
  log(`  APPWRITE_VOTES_COLLECTION_ID=${COLLECTION_IDS.votes}`, 'info');
  log(`  APPWRITE_DAILY_TOPICS_COLLECTION_ID=${COLLECTION_IDS.daily_topics}`, 'info');
  log(`  APPWRITE_TOPICS_COLLECTION_ID=${COLLECTION_IDS.topics}`, 'info');
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  setupAppwrite().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
