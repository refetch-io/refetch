import * as React from 'react'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Camera, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { saveProfile } from '@/api/profiles'
import { appwriteBrowser } from '@/lib/appwrite-browser'
import { describeAuthError } from '@/lib/auth-errors'
import { configQuery } from '@/lib/queries'
import { LIMITS } from '@/lib/constants'
import { useSession, useSetSession } from '@/lib/session'
import type { MessagePrivacy, Profile } from '@/lib/types'
import { Avatar, refreshAvatar } from '../ui/avatar'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'
import { Callout, Field } from '../ui/field'
import { Input, Textarea } from '../ui/input'
import { SegmentedControl } from '../ui/segmented-control'

export function EditProfileDialog({
  profile,
  open,
  onOpenChange,
}: {
  profile: Profile
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user } = useSession()
  const setSession = useSetSession()
  const queryClient = useQueryClient()
  const save = useServerFn(saveProfile)
  const { data: config } = useSuspenseQuery(configQuery())
  const fileInput = React.useRef<HTMLInputElement>(null)

  const [form, setForm] = React.useState({
    name: profile.name,
    bio: profile.bio,
    website: profile.website ?? '',
    allowMessages: profile.allowMessages,
  })
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [photoBusy, setPhotoBusy] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setForm({
      name: profile.name,
      bio: profile.bio,
      website: profile.website ?? '',
      allowMessages: profile.allowMessages,
    })
    setError(null)
  }, [open, profile])

  /** Account changes run as you in this browser; if its Appwrite session is gone, ask to sign in again. */
  const accountError = (cause: unknown, fallback: string) =>
    cause && typeof cause === 'object' && 'code' in cause && cause.code === 401
      ? 'Sign out and back in to change this. Your sign-in on this device has expired.'
      : cause && typeof cause === 'object' && 'type' in cause
        ? describeAuthError(cause)
        : fallback

  const onPhoto = async (file: File | undefined) => {
    if (!file) return
    if (file.size > LIMITS.photoMaxBytes) {
      toast.error('Photos can be up to 5 MB.')
      return
    }
    setPhotoBusy(true)
    try {
      if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) throw new Error('Use a PNG, JPEG or WebP image.')
      const { avatars } = await appwriteBrowser(config)
      await avatars.updatePhoto({ file })
      refreshAvatar(profile.id)
      toast.success('Photo updated')
    } catch (cause) {
      toast.error(
        cause instanceof Error && !('code' in cause)
          ? cause.message
          : accountError(cause, 'Couldn’t update your photo.'),
      )
    } finally {
      setPhotoBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const onRemovePhoto = async () => {
    setPhotoBusy(true)
    try {
      const { avatars } = await appwriteBrowser(config)
      await avatars.deletePhoto()
      refreshAvatar(profile.id)
      toast.success('Photo removed')
    } catch (cause) {
      toast.error(accountError(cause, 'Couldn’t remove your photo.'))
    } finally {
      setPhotoBusy(false)
    }
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (form.name.trim() !== profile.name) {
        // Rename the Appwrite account too, so new posts and comments carry the new name.
        const { account } = await appwriteBrowser(config)
        try {
          await account.updateName({ name: form.name.trim() })
        } catch (cause) {
          setError(accountError(cause, 'Couldn’t change your name.'))
          return
        }
      }
      const result = await save({ data: form })
      if (!result.ok) {
        setError(result.error)
        return
      }
      if (user && result.data.name !== user.name) await setSession({ ...user, name: result.data.name })
      await queryClient.invalidateQueries({ queryKey: ['profile', profile.id] })
      toast.success('Profile saved')
      onOpenChange(false)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit profile"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="md" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="md" type="submit" form="edit-profile" loading={saving}>
            Save
          </Button>
        </div>
      }
    >
      <form id="edit-profile" onSubmit={(event) => void onSubmit(event)} className="space-y-5 px-5 py-5">
        <div className="flex items-center gap-4">
          <Avatar name={form.name || profile.name} userId={profile.id} size={64} />
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => void onPhoto(event.target.files?.[0])}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={photoBusy}
              onClick={() => fileInput.current?.click()}
            >
              <Camera />
              Change photo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={photoBusy}
              onClick={() => void onRemovePhoto()}
            >
              <Trash2 />
              Remove
            </Button>
          </div>
        </div>
        <p className="-mt-2 text-caption-1 text-label-tertiary">
          Without a photo we use your sign-in provider’s picture or Gravatar, then your initials.
        </p>

        {error && <Callout tone="danger">{error}</Callout>}

        <Field label="Name" htmlFor="profile-name">
          <Input
            value={form.name}
            maxLength={LIMITS.nameMax}
            autoComplete="name"
            required
            onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
          />
        </Field>
        <Field
          label="Bio"
          htmlFor="profile-bio"
          optional
          aside={
            <span className="text-caption-1 text-label-tertiary tabular">
              {form.bio.length}/{LIMITS.bioMax}
            </span>
          }
        >
          <Textarea
            rows={3}
            maxRows={6}
            maxLength={LIMITS.bioMax}
            placeholder="What do you build? What do you read?"
            value={form.bio}
            onChange={(event) => setForm((f) => ({ ...f, bio: event.target.value }))}
          />
        </Field>
        <Field label="Website" htmlFor="profile-website" optional>
          <Input
            type="url"
            inputMode="url"
            placeholder="https://"
            maxLength={LIMITS.websiteMax}
            value={form.website}
            onChange={(event) => setForm((f) => ({ ...f, website: event.target.value }))}
          />
        </Field>
        <Field
          label="Who can message you"
          htmlFor="profile-messages"
          hint="People you already have a conversation with can always reply."
        >
          <SegmentedControl<MessagePrivacy>
            aria-label="Who can message you"
            value={form.allowMessages}
            onValueChange={(value) => setForm((f) => ({ ...f, allowMessages: value }))}
            options={[
              { value: 'everyone', label: 'Everyone' },
              { value: 'nobody', label: 'Nobody' },
            ]}
          />
        </Field>
      </form>
    </Dialog>
  )
}
