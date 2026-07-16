import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api/client'
import { getInitials } from '@/lib/utils'

export const Route = createFileRoute('/_app/account/')({
  component: AccountProfilePage,
  head: () => ({
    meta: [{ title: 'Profile - Account - Refetch' }],
  }),
})

function AccountProfilePage() {
  const { user, refreshUser } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
    }
  }, [user])

  if (!user) return null

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
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex flex-col gap-0.5">
              <CardTitle className="truncate">{user.name}</CardTitle>
              <CardDescription className="truncate">
                {user.email}
              </CardDescription>
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                {user.$id}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <form onSubmit={saveProfile}>
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your public name and email.</CardDescription>
          </CardHeader>
          <CardContent>
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
              {email.trim() !== user.email ? (
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
              ) : null}
            </FieldGroup>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={saving}>
              Save profile
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
