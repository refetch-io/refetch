import * as React from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { signUp } from '@/api/session'
import { LIMITS, LINKS } from '@/lib/constants'
import { safeRedirect } from '@/lib/redirect'
import { SITE_URL, seo } from '@/lib/seo'
import { useSetSession } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { Callout, Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  AppwriteSignInButton,
  Divider,
  PasswordInput,
  PasswordStrength,
  StoryTeaser,
} from '@/components/auth/auth-parts'

export const Route = createFileRoute('/_auth/signup')({
  head: () => ({
    meta: seo({
      title: 'Create account - Refetch',
      description: 'Join Refetch, the open-source alternative to Hacker News.',
      url: `${SITE_URL}/signup`,
    }),
  }),
  component: SignUpPage,
})

function SignUpPage() {
  const search = Route.useSearch()
  const router = useRouter()
  const setSession = useSetSession()
  const submit = useServerFn(signUp)
  const [form, setForm] = React.useState({ name: '', email: '', password: '', confirm: '' })
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [showMismatch, setShowMismatch] = React.useState(false)

  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }))

  const mismatch = form.confirm.length > 0 && form.password !== form.confirm

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (form.password.length < LIMITS.passwordMin) {
      setError(`Use at least ${LIMITS.passwordMin} characters for your password.`)
      return
    }
    if (form.password !== form.confirm) {
      setShowMismatch(true)
      return
    }
    setPending(true)
    try {
      const result = await submit({
        data: { name: form.name.trim(), email: form.email.trim(), password: form.password },
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      await setSession(result.data)
      toast.success('Welcome to Refetch!', { description: 'Your account is ready.' })
      router.history.push(`/welcome?redirect=${encodeURIComponent(safeRedirect(search.redirect))}`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <StoryTeaser storyId={search.story} label="Sign up to keep reading" />
      <h1 className="text-title-1 text-label">Create your account</h1>
      <p className="mt-1.5 text-subhead text-label-secondary">
        Join the community curating tech news in the open.
      </p>

      <div className="mt-8">
        <AppwriteSignInButton redirect={search.redirect} label="Sign up with Appwrite" onError={setError} />
      </div>

      <Divider label="or" />

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Name" htmlFor="name">
          <Input
            autoComplete="name"
            required
            maxLength={LIMITS.nameMax}
            placeholder="Ada Lovelace"
            value={form.name}
            onChange={update('name')}
          />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="you@example.com"
            value={form.email}
            onChange={update('email')}
          />
        </Field>
        <div className="space-y-2">
          <Field label="Password" htmlFor="password">
            <PasswordInput
              autoComplete="new-password"
              required
              minLength={LIMITS.passwordMin}
              maxLength={LIMITS.passwordMax}
              placeholder="At least 8 characters"
              value={form.password}
              onChange={update('password')}
            />
          </Field>
          <PasswordStrength password={form.password} />
        </div>
        <Field
          label="Confirm password"
          htmlFor="confirm"
          error={showMismatch && mismatch ? 'Passwords don’t match.' : null}
        >
          <PasswordInput
            autoComplete="new-password"
            required
            placeholder="Repeat your password"
            value={form.confirm}
            onChange={update('confirm')}
            onBlur={() => setShowMismatch(true)}
          />
        </Field>

        {error && <Callout>{error}</Callout>}

        <Button type="submit" variant="primary" size="xl" loading={pending} className="w-full rounded-full">
          Create account
        </Button>
        <p className="px-2 text-center text-caption-1 text-label-tertiary">
          By creating an account you agree to the{' '}
          <a
            href={LINKS.terms}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
          >
            Terms
          </a>{' '}
          and{' '}
          <a
            href={LINKS.privacy}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
          >
            Privacy Policy
          </a>
          .
        </p>
      </form>

      <p className="mt-8 text-center text-subhead text-label-secondary">
        Already have an account?{' '}
        <Link
          to="/signin"
          search={{ redirect: search.redirect, story: search.story }}
          className="font-semibold text-brand-text hover:underline"
        >
          Sign in
        </Link>
      </p>
    </>
  )
}
