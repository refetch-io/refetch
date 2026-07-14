import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { Users } from 'node-appwrite'
import type { Models } from 'node-appwrite'
import {
  ID,
  Query,
  createApiKeyClient,
  getTablesDB,
  tables,
} from '../appwrite.server'
import { AuthError } from './auth-error.server'

const KEY_PREFIX = 'rfk_'
const MAX_KEYS_PER_USER = 10

export type ApiKeyRecord = {
  id: string
  name: string
  prefix: string
  createdAt: string
  lastUsedAt: string | null
}

export type CreatedApiKey = ApiKeyRecord & {
  /** Full secret - only returned once at creation. */
  secret: string
}

type KeyRow = {
  $id: string
  $createdAt: string
  userId: string
  userName: string
  name: string
  prefix: string
  secret: string
  lastUsedAt?: string | null
}

export function isApiKeyToken(token: string) {
  return token.startsWith(KEY_PREFIX)
}

function extractPrefix(token: string): string | null {
  // Format: rfk_<8hex>_<secret>
  const parts = token.split('_')
  if (parts.length < 3 || parts[0] !== 'rfk') return null
  return `${parts[0]}_${parts[1]}`
}

function generateSecretParts() {
  const id = randomBytes(4).toString('hex')
  const secret = randomBytes(24).toString('base64url')
  const prefix = `${KEY_PREFIX}${id}`
  const fullKey = `${prefix}_${secret}`
  return { prefix, fullKey }
}

function secretsMatch(presented: string, stored: string) {
  const a = createHash('sha256').update(presented).digest()
  const b = createHash('sha256').update(stored).digest()
  return timingSafeEqual(a, b)
}

function toRecord(row: KeyRow): ApiKeyRecord {
  return {
    id: row.$id,
    name: row.name,
    prefix: row.prefix,
    createdAt: row.$createdAt,
    lastUsedAt: row.lastUsedAt ?? null,
  }
}

async function touchLastUsed(keyId: string) {
  try {
    const db = getTablesDB()
    await db.updateRow({
      databaseId: tables.databaseId(),
      tableId: tables.keys(),
      rowId: keyId,
      data: { lastUsedAt: new Date().toISOString() },
    })
  } catch {
    // Non-fatal - auth still succeeds
  }
}

export async function getUserFromApiKey(
  token: string,
): Promise<Models.User<Models.Preferences>> {
  const prefix = extractPrefix(token)
  if (!prefix) {
    throw new AuthError('Invalid API key', 401)
  }

  const db = getTablesDB()
  const result = await db.listRows({
    databaseId: tables.databaseId(),
    tableId: tables.keys(),
    queries: [Query.equal('prefix', prefix), Query.limit(1)],
  })

  const row = result.rows[0] as unknown as KeyRow | undefined
  if (!row?.secret || !secretsMatch(token, row.secret)) {
    throw new AuthError('Invalid API key', 401)
  }

  void touchLastUsed(row.$id)

  try {
    const users = new Users(createApiKeyClient())
    return await users.get({ userId: row.userId })
  } catch {
    // Fallback when the server key lacks users.read - enough for authorship checks.
    return {
      $id: row.userId,
      name: row.userName || 'User',
      email: '',
      prefs: {},
    } as Models.User<Models.Preferences>
  }
}

export async function listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  const db = getTablesDB()
  const result = await db.listRows({
    databaseId: tables.databaseId(),
    tableId: tables.keys(),
    queries: [
      Query.equal('userId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ],
  })

  return (result.rows as unknown as KeyRow[]).map(toRecord)
}

export async function createApiKey(
  userId: string,
  userName: string,
  name: string,
): Promise<CreatedApiKey> {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new AuthError('Key name is required', 400)
  }
  if (trimmed.length > 128) {
    throw new AuthError('Key name must be 128 characters or fewer', 400)
  }

  const existing = await listApiKeys(userId)
  if (existing.length >= MAX_KEYS_PER_USER) {
    throw new AuthError(
      `You can create at most ${MAX_KEYS_PER_USER} API keys`,
      400,
    )
  }

  const { prefix, fullKey } = generateSecretParts()
  const db = getTablesDB()
  const row = (await db.createRow({
    databaseId: tables.databaseId(),
    tableId: tables.keys(),
    rowId: ID.unique(),
    data: {
      userId,
      userName: userName.trim() || 'User',
      name: trimmed,
      prefix,
      secret: fullKey,
    } as Record<string, unknown>,
  })) as unknown as KeyRow

  return {
    ...toRecord(row),
    secret: fullKey,
  }
}

export async function deleteApiKey(userId: string, keyId: string) {
  const db = getTablesDB()
  let row: KeyRow
  try {
    row = (await db.getRow({
      databaseId: tables.databaseId(),
      tableId: tables.keys(),
      rowId: keyId,
    })) as unknown as KeyRow
  } catch {
    throw new AuthError('API key not found', 404)
  }

  if (row.userId !== userId) {
    throw new AuthError('Forbidden', 403)
  }

  await db.deleteRow({
    databaseId: tables.databaseId(),
    tableId: tables.keys(),
    rowId: keyId,
  })
}
