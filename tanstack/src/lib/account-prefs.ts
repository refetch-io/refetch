import { account } from '@/lib/appwrite-web'

/**
 * Appwrite updatePrefs replaces the whole prefs object. Serialize merges so
 * concurrent theme / presence / sidebar writes do not drop each other.
 */
let prefsQueue: Promise<void> = Promise.resolve()

export async function updateAccountPrefs(
  patch: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  let result: Record<string, unknown> = {}

  const run = async () => {
    const prefs = await account.getPrefs<Record<string, unknown>>()
    const next = {
      ...prefs,
      ...patch,
    }
    await account.updatePrefs({ prefs: next })
    result = next
  }

  const scheduled = prefsQueue.then(run, run)
  prefsQueue = scheduled.then(
    () => undefined,
    () => undefined,
  )
  await scheduled
  return result
}

export function coercePrefBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (value === 'true' || value === 1) return true
  if (value === 'false' || value === 0) return false
  return null
}
