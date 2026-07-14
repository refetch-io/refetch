import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { Models } from 'appwrite'
import { Monitor, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api/client'
import { account } from '@/lib/appwrite-web'
import { clearCachedJWT } from '@/lib/jwt-cache'
import { clearOwnPresence, resetPresenceSharingSession } from '@/lib/presence'

function formatSessionDate(value: string) {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function sessionLabel(session: Models.Session) {
  const client = [session.clientName, session.clientVersion]
    .filter(Boolean)
    .join(' ')
  const os = [session.osName, session.osVersion].filter(Boolean).join(' ')
  if (client && os) return `${client} on ${os}`
  return client || os || session.provider || 'Unknown device'
}

export const Route = createFileRoute('/_app/account/security')({
  component: AccountSecurityPage,
  head: () => ({
    meta: [{ title: 'Security - Account - Refetch' }],
  }),
})

function AccountSecurityPage() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [sessions, setSessions] = useState<Models.Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const loadSessions = async () => {
    setLoadingSessions(true)
    try {
      const result = await account.listSessions()
      const sorted = [...result.sessions].sort((a, b) => {
        if (a.current === b.current) {
          return b.$createdAt.localeCompare(a.$createdAt)
        }
        return a.current ? -1 : 1
      })
      setSessions(sorted)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions')
    } finally {
      setLoadingSessions(false)
    }
  }

  useEffect(() => {
    void loadSessions()
  }, [])

  if (!user) return null

  const canConfirmDelete =
    confirmEmail.trim().toLowerCase() === user.email.trim().toLowerCase()

  const revokeSession = async (session: Models.Session) => {
    setRevokingId(session.$id)
    setError('')
    try {
      if (session.current) {
        await logout()
        navigate({ to: '/' })
        return
      }
      await account.deleteSession({ sessionId: session.$id })
      await loadSessions()
      setMessage('Session revoked')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke session')
    } finally {
      setRevokingId(null)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await api.updateAccount({ oldPassword, newPassword })
      setOldPassword('')
      setNewPassword('')
      setMessage('Password updated')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  const deleteAccount = async () => {
    if (!canConfirmDelete) return
    setDeleting(true)
    setError('')
    try {
      await clearOwnPresence(user.$id).catch(() => {})
      await api.deleteAccount()
      clearCachedJWT()
      resetPresenceSharingSession()
      try {
        await account.deleteSessions()
      } catch {
        // Account may already be gone
      }
      await refreshUser()
      navigate({ to: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account')
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Update your sign-in password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="old-password">Current password</FieldLabel>
                <Input
                  id="old-password"
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="new-password">New password</FieldLabel>
                <Input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <FieldDescription>At least 8 characters.</FieldDescription>
              </Field>
              <Button type="submit" variant="outline" disabled={saving}>
                Update password
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>
            Devices currently signed in to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {loadingSessions ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active sessions.</p>
          ) : (
            <ul className="divide-y divide-border">
              {sessions.map((session) => (
                <li
                  key={session.$id}
                  className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Monitor className="size-4" />
                    </div>
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {sessionLabel(session)}
                        </p>
                        {session.current ? (
                          <Badge variant="brand">Current</Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {[session.ip, session.countryName]
                          .filter(Boolean)
                          .join(' · ') || 'Location unknown'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Signed in {formatSessionDate(session.$createdAt)}
                        {session.expire
                          ? ` · Expires ${formatSessionDate(session.expire)}`
                          : null}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 shrink-0 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive"
                    disabled={revokingId === session.$id}
                    onClick={() => void revokeSession(session)}
                  >
                    {revokingId === session.$id ? (
                      <Spinner />
                    ) : (
                      <Trash2 />
                    )}
                    {session.current ? 'Sign out' : 'Revoke'}
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
            <Button
              variant="outline"
              onClick={async () => {
                await logout()
                navigate({ to: '/' })
              }}
            >
              Sign out
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await account.deleteSessions()
                  clearCachedJWT()
                  await refreshUser()
                  navigate({ to: '/signin' })
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : 'Failed to sign out everywhere',
                  )
                }
              }}
            >
              Sign out everywhere
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
          <CardDescription>
            Permanently delete your Refetch account. This cannot be undone.
            Your posts and comments may remain as historical content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog
            open={deleteOpen}
            onOpenChange={(open) => {
              setDeleteOpen(open)
              if (!open) setConfirmEmail('')
            }}
          >
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent size="default" className="sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes your account and sign-in access. Type{' '}
                  <span className="font-medium text-foreground">
                    {user.email}
                  </span>{' '}
                  to confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Field>
                <FieldLabel htmlFor="confirm-delete-email">
                  Email confirmation
                </FieldLabel>
                <Input
                  id="confirm-delete-email"
                  type="email"
                  autoComplete="off"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder={user.email}
                  disabled={deleting}
                />
              </Field>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={!canConfirmDelete || deleting}
                  onClick={(event) => {
                    event.preventDefault()
                    void deleteAccount()
                  }}
                >
                  {deleting ? <Spinner data-icon="inline-start" /> : null}
                  Delete account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
