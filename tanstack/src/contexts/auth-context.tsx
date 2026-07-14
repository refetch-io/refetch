import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { writeAccountPreviewCookie, writeSignedInCookie } from '@/lib/auth-cookie'
import { account } from '@/lib/appwrite-web'
import { clearCachedJWT } from '@/lib/jwt-cache'
import { clearOwnPresence, resetPresenceSharingSession } from '@/lib/presence'
import type { AccountUser } from '@/lib/types'

interface AuthContextType {
  user: AccountUser | null
  loading: boolean
  isAuthenticated: boolean
  getUserDisplayName: () => string | null
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const currentUser = await account.get()
      const nextUser: AccountUser = {
        $id: currentUser.$id,
        name: currentUser.name || '',
        email: currentUser.email || '',
        $createdAt: currentUser.$createdAt,
        emailVerification: currentUser.emailVerification,
        prefs: currentUser.prefs as Record<string, unknown> | undefined,
      }
      setUser(nextUser)
      writeAccountPreviewCookie({
        name:
          nextUser.name.trim() ||
          nextUser.email.trim() ||
          'Your account',
        email: nextUser.email,
      })
    } catch {
      setUser(null)
      writeSignedInCookie(false)
    }
  }

  useEffect(() => {
    ;(async () => {
      await refreshUser()
      setLoading(false)
    })()
  }, [])

  const getUserDisplayName = () => {
    if (!user) return null
    if (user.name?.trim()) return user.name
    if (user.email?.trim()) return user.email
    return 'Your account'
  }

  const logout = async () => {
    const userId = user?.$id
    try {
      if (userId) {
        await clearOwnPresence(userId).catch(() => {})
      }
      await account.deleteSession({ sessionId: 'current' })
    } catch {
      // clear local state regardless
    } finally {
      clearCachedJWT()
      resetPresenceSharingSession()
      writeSignedInCookie(false)
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        getUserDisplayName,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
