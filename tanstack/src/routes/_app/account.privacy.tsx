import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { PresenceVisibilityToggle } from '@/components/presence-visibility-toggle'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import {
  getPresenceSharingEnabled,
  persistPresenceSharing,
} from '@/lib/presence'

export const Route = createFileRoute('/_app/account/privacy')({
  component: AccountPrivacyPage,
  head: () => ({
    meta: [{ title: 'Privacy - Account - Refetch' }],
  }),
})

function AccountPrivacyPage() {
  const { user, refreshUser } = useAuth()
  const [sharePresence, setSharePresence] = useState(true)
  const [savingPresence, setSavingPresence] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) setSharePresence(getPresenceSharingEnabled(user.prefs))
  }, [user])

  if (!user) return null

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
          ? "You'll appear as online to other signed-in refetchers."
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
          <CardTitle>Presence</CardTitle>
          <CardDescription>
            Show when you are online in the community list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PresenceVisibilityToggle
            enabled={sharePresence}
            disabled={savingPresence}
            onChange={togglePresenceSharing}
            className="max-w-xs"
          />
        </CardContent>
      </Card>
    </div>
  )
}
