import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { MailCheck, MailMinus, MailWarning } from 'lucide-react'
import { z } from 'zod'
import { confirmUnsubscribe, fetchUnsubscribe } from '@/api/notifications'
import type { EmailSettings } from '@/lib/digest'
import { seo } from '@/lib/seo'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/*
 * Where every email's "Unsubscribe" (and "Switch to weekly") link lands. The
 * signed link works without signing in, but nothing changes until you press
 * a button, so link scanners that open emails can't unsubscribe anyone.
 */

const searchSchema = z.object({
  u: z.string().max(64).catch(''),
  l: z.enum(['digest', 'activity']).catch('digest'),
  t: z.string().max(64).catch(''),
  switch: z.enum(['daily', 'weekly']).optional().catch(undefined),
})

type Action = 'unsubscribe' | 'resubscribe' | 'daily' | 'weekly'

export const Route = createFileRoute('/_app/email/unsubscribe')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ u: search.u, l: search.l, t: search.t }),
  loader: ({ deps }) =>
    deps.u && deps.t ? fetchUnsubscribe({ data: deps }).catch(() => null) : Promise.resolve(null),
  head: () => ({
    meta: seo({ title: 'Email preferences - Refetch', noindex: true }),
  }),
  component: UnsubscribePage,
})

function UnsubscribePage() {
  const search = Route.useSearch()
  const initial = Route.useLoaderData()
  const confirm = useServerFn(confirmUnsubscribe)
  const [settings, setSettings] = React.useState<EmailSettings | null>(initial)
  const [done, setDone] = React.useState<Action | null>(null)
  const [pending, setPending] = React.useState<Action | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  if (!settings) {
    return (
      <Frame icon={<MailWarning />} title="This link doesn’t work anymore">
        <p>It may be incomplete or out of date. You can change every email Refetch sends you in Settings.</p>
        <Actions>
          <Button asChild variant="primary" size="lg">
            <Link to="/settings" hash="email">
              Email settings
            </Link>
          </Button>
        </Actions>
      </Frame>
    )
  }

  const run = async (action: Action) => {
    setPending(action)
    setError(null)
    try {
      const result = await confirm({ data: { u: search.u, l: search.l, t: search.t, action } })
      if (!result.ok) throw new Error(result.error)
      setSettings(result.data)
      setDone(action)
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message ? caught.message : 'Something went wrong. Try again.',
      )
    } finally {
      setPending(null)
    }
  }

  const button = (action: Action, label: string, variant: 'primary' | 'secondary' = 'secondary') => (
    <Button
      variant={variant}
      size="lg"
      loading={pending === action}
      disabled={pending !== null}
      onClick={() => void run(action)}
    >
      {label}
    </Button>
  )

  const settingsLink = (
    <p className="mt-5 text-footnote text-label-tertiary">
      Signed in?{' '}
      <Link to="/settings" hash="email" className="font-semibold text-brand-text hover:underline">
        Manage all your emails in Settings
      </Link>
    </p>
  )

  if (search.l === 'activity') {
    const off = !settings.email
    return (
      <Frame
        icon={off ? <MailCheck /> : <MailMinus />}
        title={off ? 'You’re unsubscribed from activity emails' : 'Unsubscribe from activity emails?'}
      >
        <p>
          {off
            ? 'You won’t get emails about replies, mentions, comments on your stories or new followers. They still show up under Notifications on Refetch.'
            : 'You’ll stop getting emails about replies, mentions, comments on your stories and new followers. They’ll still show up under Notifications on Refetch.'}
        </p>
        <Actions>
          {off ? button('resubscribe', 'Resubscribe') : button('unsubscribe', 'Unsubscribe', 'primary')}
        </Actions>
        <Status done={done} error={error} />
        {settingsLink}
      </Frame>
    )
  }

  const off = settings.digest === 'off'
  const other = settings.digest === 'daily' ? 'weekly' : 'daily'
  // "Switch to weekly" links ask about switching first; unsubscribing stays one tap away.
  const switching = !off && !done && search.switch === other

  return (
    <Frame
      icon={off ? <MailCheck /> : <MailMinus />}
      title={
        off
          ? 'You’re unsubscribed from the digest'
          : switching
            ? `Switch to the ${other} digest?`
            : `Unsubscribe from the ${settings.digest} digest?`
      }
    >
      <p>
        {off
          ? 'You won’t get daily or weekly digests anymore. Emails about replies and mentions are separate.'
          : settings.digest === 'daily'
            ? 'You get the best stories every morning at 8. Prefer one email a week? Switch to weekly instead.'
            : 'You get the week’s best stories on Mondays at 8. Want them every morning? Switch to daily instead.'}
      </p>
      <Actions>
        {off ? (
          <>
            {button('weekly', 'Get the weekly digest', 'primary')}
            {button('daily', 'Get the daily digest')}
          </>
        ) : switching ? (
          <>
            {button(other, `Switch to ${other}`, 'primary')}
            {button('unsubscribe', 'Unsubscribe instead')}
          </>
        ) : (
          <>
            {button('unsubscribe', 'Unsubscribe', 'primary')}
            {button(other, `Switch to ${other} instead`)}
          </>
        )}
      </Actions>
      <Status done={done} error={error} />
      {settingsLink}
    </Frame>
  )
}

function Frame({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-lg py-6 sm:py-12">
      <Card className="animate-rise-in p-6 text-center sm:p-8">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-tint text-brand-text [&_svg]:size-6">
          {icon}
        </span>
        <h1 className="mt-4 text-title-2 text-balance text-label">{title}</h1>
        <div className="mt-2 text-subhead text-pretty text-label-secondary">{children}</div>
      </Card>
    </div>
  )
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">{children}</div>
}

const DONE_MESSAGES: Record<Action, string> = {
  unsubscribe: 'Done. You’re unsubscribed.',
  resubscribe: 'Welcome back. You’re subscribed again.',
  daily: 'Done. You’ll get the daily digest.',
  weekly: 'Done. You’ll get the weekly digest.',
}

function Status({ done, error }: { done: Action | null; error: string | null }) {
  return (
    <p role="status" aria-live="polite" className="mt-4 min-h-5 text-footnote font-medium">
      {error ? (
        <span className="text-down">{error}</span>
      ) : done ? (
        <span className="text-up">{DONE_MESSAGES[done]}</span>
      ) : null}
    </p>
  )
}
