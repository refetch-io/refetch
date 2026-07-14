import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { account } from '@/lib/appwrite-web'
import { updateAccountPrefs } from '@/lib/account-prefs'
import { useAuth } from '@/contexts/auth-context'
import {
  isThemePreference,
  type ThemePreference,
} from '@/lib/theme'

/** Load theme from Appwrite prefs when the user signs in. */
export function ThemeSync() {
  const { setTheme } = useTheme()
  const { isAuthenticated, loading, user } = useAuth()
  const appliedForUser = useRef<string | null>(null)

  useEffect(() => {
    if (loading || !isAuthenticated || !user) {
      if (!isAuthenticated) appliedForUser.current = null
      return
    }
    if (appliedForUser.current === user.$id) return

    ;(async () => {
      try {
        const prefs = await account.getPrefs<{ theme?: string }>()
        const theme = prefs.theme
        if (isThemePreference(theme)) {
          setTheme(theme)
          appliedForUser.current = user.$id
        } else {
          appliedForUser.current = user.$id
        }
      } catch {
        // guest / network - keep local theme
      }
    })()
  }, [isAuthenticated, loading, user, setTheme])

  return null
}

/** Persist theme to Appwrite prefs (merge; updatePrefs replaces the whole object). */
export async function persistThemePreference(theme: ThemePreference) {
  try {
    await updateAccountPrefs({ theme })
  } catch {
    // Not signed in - localStorage via next-themes is enough.
  }
}
