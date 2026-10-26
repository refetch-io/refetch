import * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { signInWithEmail } from '@/lib/auth-client'
import { configQuery } from '@/lib/queries'
import { safeRedirect } from '@/lib/redirect'
import { SITE_URL, seo } from '@/lib/seo'
import { useSetSession } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { Callout, Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AppwriteSignInButton, Divider, PasswordInput, StoryTeaser } from '@/components/auth/auth-parts'

export const Route = createFileRoute('/_auth/signin')({
  head: () => ({
    meta: seo({ title: 'Sign in - Refetch', description: 'Sign in to Refetch.', url: `${SITE_URL}/signin` }),
  }),
  component: SignInPage,
})

/** Appwrite appends `error={"message":…}` to the failure URL. */
function oauthErrorMessage(raw?: string) {
  if (!raw) return 'We couldn’t sign you in with Appwrite. Please try again.'
  try {
    const parsed = JSON.parse(raw) as { message?: string }
    if (parsed.message) return parsed.message
  } catch {
    // Not JSON — fall through to the generic copy.
  }
  return 'We couldn’t sign you in with Appwrite. Please try again.'
}

function SignInPage() {
  const search = Route.useSearch()
  const router = useRouter()
  const setSession = useSetSession()
  const { data: config } = useSuspenseQuery(configQuery())
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(
    search.oauth === 'failed' ? oauthErrorMessage(search.error) : null,
  )

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const result = await signInWithEmail(config, email.trim(), password)
      if (!result.ok) {
        setError(result.error)
        return
      }
      const { user } = result.data
      await setSession(user)
      toast.success(`Welcome back${user.name ? `, ${user.name.split(' ')[0]}` : ''}!`)
      router.history.push(safeRedirect(search.redirect))
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <StoryTeaser storyId={search.story} label="Sign in to keep reading" />
      <h1 className="text-title-1 text-label">Sign in</h1>
      <p className="mt-1.5 text-subhead text-label-secondary">
        Welcome back. Vote, discuss and share stories.
      </p>

      <div className="mt-8">
        <AppwriteSignInButton redirect={search.redirect} onError={setError} />
      </div>

      <Divider label="or" />

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" htmlFor="email">
          <Input
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <PasswordInput
            autoComplete="current-password"
            required
            placeholder="Your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        {error && <Callout>{error}</Callout>}

        <Button type="submit" variant="primary" size="xl" loading={pending} className="w-full rounded-full">
          Sign in
        </Button>
      </form>

      <p className="mt-8 text-center text-subhead text-label-secondary">
        New to Refetch?{' '}
        <Link
          to="/signup"
          search={{ redirect: search.redirect, story: search.story }}
          className="font-semibold text-brand-text hover:underline"
        >
          Create an account
        </Link>
      </p>
    </>
  )
}
