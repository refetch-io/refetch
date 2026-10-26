import * as React from 'react'
import { useServerFn } from '@tanstack/react-start'
import { Eye, EyeOff } from 'lucide-react'
import { startAppwriteOAuth } from '@/api/session'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { AppwriteIcon } from '../brand-icons'
import { useQuery } from '@tanstack/react-query'
import { fetchStoryPreview } from '@/api/content'
import { isValidId } from '@/lib/url'
import { Favicon } from '../favicon'

/** "Continue with Appwrite" — signs in with an Appwrite account via OAuth2. */
export function AppwriteSignInButton({
  redirect,
  label = 'Continue with Appwrite',
  onError,
}: {
  redirect?: string
  label?: string
  onError: (message: string) => void
}) {
  const start = useServerFn(startAppwriteOAuth)
  const [pending, setPending] = React.useState(false)

  const onClick = async () => {
    setPending(true)
    try {
      const result = await start({ data: { redirect } })
      if (result.ok) {
        window.location.assign(result.data.url)
        return // keep the spinner while the browser navigates away
      }
      onError(result.error)
    } catch {
      onError('Couldn’t reach Appwrite. Please try again.')
    }
    setPending(false)
  }

  return (
    <Button
      variant="dark"
      size="xl"
      loading={pending}
      onClick={onClick}
      className="w-full gap-2.5 rounded-full text-callout"
    >
      <AppwriteIcon className="!h-4 !w-auto text-[#fd366e]" />
      {label}
    </Button>
  )
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-caption-1 font-medium tracking-[0.08em] text-label-tertiary uppercase">
      <span className="h-px flex-1 bg-separator" />
      {label}
      <span className="h-px flex-1 bg-separator" />
    </div>
  )
}

export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = React.useState(false)
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={cn('pr-11', props.className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-full text-label-tertiary transition-colors hover:bg-fill hover:text-label"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

/** Four-step strength meter (length + variety), purely advisory. */
export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['bg-down', 'bg-down', 'bg-warning', 'bg-up', 'bg-up']
  const strength = password.length < 8 ? 0 : Math.max(1, score)

  return (
    <div className="flex items-center gap-2 px-1" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-300',
              strength >= step ? colors[strength] : 'bg-fill',
            )}
          />
        ))}
      </div>
      <span className="w-16 text-right text-caption-1 text-label-tertiary">{labels[strength]}</span>
    </div>
  )
}

/**
 * "Sign up to keep reading": the story a visitor tried to open, shown above
 * the form when they arrive from a gated link (`?story=<id>`).
 */
export function StoryTeaser({ storyId, label }: { storyId: string | undefined; label: string }) {
  const id = storyId && isValidId(storyId) ? storyId : null
  const { data: story } = useQuery({
    queryKey: ['story-preview', id],
    queryFn: () => fetchStoryPreview({ data: { id: id! } }),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  })
  if (!id || !story) return null
  return (
    <div className="mb-8 animate-rise-in">
      <p className="px-1 text-caption-1 font-semibold tracking-[0.06em] text-label-tertiary uppercase">
        {label}
      </p>
      {/* Same shape as a story row: the thing they wanted, nothing louder. */}
      <div className="mt-2 flex items-start gap-3 rounded-card bg-surface p-3.5 shadow-card">
        <Favicon domain={story.domain} size={20} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-subhead font-semibold text-label">{story.title}</p>
          <p className="mt-0.5 truncate text-caption-1 text-label-tertiary">{story.domain ?? 'refetch.io'}</p>
        </div>
      </div>
    </div>
  )
}
