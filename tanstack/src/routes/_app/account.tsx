import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'
import { PresenceVisibilityToggle } from '@/components/presence-visibility-toggle'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api/client'
import { account } from '@/lib/appwrite-web'
import { clearCachedJWT } from '@/lib/jwt-cache'
import {
  isPresenceSharingEnabled,
  persistPresenceSharing,
} from '@/lib/presence'

export const Route = createFileRoute('/_app/account')({
  component: AccountPage,
  head: () => ({
    meta: [{ title: 'Account — Refetch' }],
  }),
})

function AccountPage() {
  const { user, loading, isAuthenticated, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [sharePresence, setSharePresence] = useState(true)
  const [savingPresence, setSavingPresence] = useState(false)

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate({ to: '/signin' })
  }, [loading, isAuthenticated, navigate])

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
      setSharePresence(isPresenceSharingEnabled(user.prefs))
    }
  }, [user])

  if (loading || !user) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload: {
        name?: string
        email?: string
        password?: string
      } = {}
      if (name.trim() && name.trim() !== user.name) payload.name = name.trim()
      if (email.trim() && email.trim() !== user.email) {
        if (!password) {
          setError('Current password is required to change email')
          setSaving(false)
          return
        }
        payload.email = email.trim()
        payload.password = password
      }
      if (Object.keys(payload).length === 0) {
        setMessage('No changes to save')
        setSaving(false)
        return
      }
      await api.updateAccount(payload)
      await refreshUser()
      setPassword('')
      setMessage('Account updated')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account')
    } finally {
      setSaving(false)
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

  const togglePresenceSharing = async (enabled: boolean) => {
    const previous = sharePresence
    setSharePresence(enabled)
    setSavingPresence(true)
    setError('')
    setMessage('')
    try {
      await persistPresenceSharing(enabled)
      await refreshUser()
      setMessage(
        enabled
          ? 'You’ll appear as online to other signed-in refetchers.'
          : 'Your presence is hidden from other refetchers.',
      )
    } catch (err) {
      setSharePresence(previous)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to update presence preference',
      )
    } finally {
      setSavingPresence(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Account
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile and credentials.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your public name and email.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="account-name">Name</FieldLabel>
                <Input
                  id="account-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="account-email">Email</FieldLabel>
                <Input
                  id="account-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              {email.trim() !== user.email && (
                <Field>
                  <FieldLabel htmlFor="account-password">
                    Current password
                  </FieldLabel>
                  <Input
                    id="account-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <FieldDescription>
                    Required to change your email.
                  </FieldDescription>
                </Field>
              )}
              <Button type="submit" disabled={saving}>
                Save profile
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
          <CardDescription>
            Control what other signed-in refetchers can see about you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PresenceVisibilityToggle
            enabled={sharePresence}
            disabled={savingPresence}
            onChange={togglePresenceSharing}
            className="max-w-sm"
          />
        </CardContent>
      </Card>

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
              <Button type="submit" disabled={saving} variant="outline">
                Update password
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>Sign out on this device or everywhere.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row">
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
              variant="destructive"
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
          <Separator />
          <p className="text-xs text-muted-foreground">
            User ID: <code>{user.$id}</code>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
