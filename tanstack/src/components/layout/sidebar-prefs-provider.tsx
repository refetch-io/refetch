import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useAuth } from '@/contexts/auth-context'
import { account } from '@/lib/appwrite-web'
import {
  getSidebarOpenFromPrefs,
  persistSidebarOpenPreference,
  readSidebarOpenCookie,
  writeSidebarOpenCookie,
} from '@/lib/sidebar-prefs'

export function SidebarPrefsProvider({
  children,
  defaultOpen = true,
}: {
  children: ReactNode
  defaultOpen?: boolean
}) {
  const { user, loading, isAuthenticated, refreshUser } = useAuth()
  const [open, setOpen] = useState(defaultOpen)
  const [clientReady, setClientReady] = useState(false)
  const appliedForUser = useRef<string | null>(null)
  const userOverride = useRef(false)

  // Remount after hydration with the client cookie. SSR mismatches on
  // data-state are not patched by React, so a remount is required.
  useLayoutEffect(() => {
    const fromCookie = readSidebarOpenCookie()
    if (fromCookie !== null) setOpen(fromCookie)
    setClientReady(true)
  }, [])

  useEffect(() => {
    if (loading) return

    if (!isAuthenticated || !user) {
      appliedForUser.current = null
      userOverride.current = false
      return
    }

    if (appliedForUser.current === user.$id) return

    let cancelled = false

    ;(async () => {
      try {
        const prefs = await account.getPrefs<Record<string, unknown>>()
        if (cancelled || userOverride.current) return

        const fromPrefs =
          getSidebarOpenFromPrefs(prefs) ??
          getSidebarOpenFromPrefs(user.prefs)

        if (fromPrefs !== null) {
          setOpen(fromPrefs)
          writeSidebarOpenCookie(fromPrefs)
        }
      } catch {
        if (cancelled || userOverride.current) return
        const fromPrefs = getSidebarOpenFromPrefs(user.prefs)
        if (fromPrefs !== null) {
          setOpen(fromPrefs)
          writeSidebarOpenCookie(fromPrefs)
        }
      } finally {
        if (!cancelled) {
          appliedForUser.current = user.$id
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [loading, isAuthenticated, user])

  const handleOpenChange = (next: boolean) => {
    userOverride.current = true
    setOpen(next)
    writeSidebarOpenCookie(next)

    if (!isAuthenticated) return

    void persistSidebarOpenPreference(next)
      .then(() => refreshUser())
      .catch(() => {
        // Cookie still holds the local choice; prefs retry on next toggle.
      })
  }

  return (
    <SidebarProvider
      key={clientReady ? 'client' : 'ssr'}
      open={open}
      onOpenChange={handleOpenChange}
      className="flex-col"
    >
      {children}
    </SidebarProvider>
  )
}
