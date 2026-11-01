import * as React from 'react'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ArrowUpRight, ChevronDown, EyeOff, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { saveNotificationSettings } from '@/api/notifications'
import { type DigestFrequency, type EmailSettings, describeSchedule, isTimeZone } from '@/lib/digest'
import { type Mute, type MuteKind, normalizeMute } from '@/lib/mutes'
import { mutesQuery, notificationSettingsQuery } from '@/lib/queries'
import { SITE_URL, seo } from '@/lib/seo'
import { topicDisplayLabel } from '@/lib/topics'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SectionLabel } from '@/components/ui/card'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { ColumnTitle } from '@/components/feed/feed-column'
import { FeedLayout } from '@/components/feed/feed-layout'
import { useChannels } from '@/components/channels/channel-parts'
import { useMutes } from '@/components/mutes/mute-parts'

export const Route = createFileRoute('/_app/settings')({
  beforeLoad: ({ context, location }) => {
    if (!context.user) throw redirect({ to: '/signin', search: { redirect: location.href } })
    return { user: context.user }
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(notificationSettingsQuery(context.user.id)),
      context.queryClient.ensureQueryData(mutesQuery(context.user.id)),
    ]),
  head: () => ({
    meta: seo({ title: 'Settings - Refetch', url: `${SITE_URL}/settings`, noindex: true }),
  }),
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <FeedLayout column={<ColumnTitle title="Settings" subtitle="Emails, digests and what you’ve muted." />}>
      <EmailSection />
      <MutedSection />
    </FeedLayout>
  )
}

/* ─────────────────────────────────── Email ─────────────────────────────────── */

function detectedTimeZone(): string | null {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return isTimeZone(zone) ? zone : null
  } catch {
    return null
  }
}

function useEmailSettings() {
  const { user } = Route.useRouteContext()
  const queryClient = useQueryClient()
  const save = useServerFn(saveNotificationSettings)
  const query = notificationSettingsQuery(user.id)
  const { data } = useSuspenseQuery(query)
  const [saving, setSaving] = React.useState(false)

  const update = async (
    patch: Partial<Omit<EmailSettings, 'timezone'>> & { timezone?: string },
    message?: string,
  ) => {
    if (!data) return
    const previous = data
    queryClient.setQueryData(query.queryKey, { ...previous, ...patch })
    setSaving(true)
    try {
      const result = await save({ data: patch })
      if (!result.ok) throw new Error(result.error)
      queryClient.setQueryData(query.queryKey, result.data)
      if (message) toast.success(message)
    } catch (error) {
      queryClient.setQueryData(query.queryKey, previous)
      toast.error(error instanceof Error && error.message ? error.message : 'Couldn’t save that.')
    } finally {
      setSaving(false)
    }
  }

  return { settings: data, saving, update }
}

const DIGEST_MESSAGES: Record<DigestFrequency, string> = {
  off: 'Digest turned off',
  daily: 'You’ll get the daily digest',
  weekly: 'You’ll get the weekly digest',
}

function EmailSection() {
  const { settings, saving, update } = useEmailSettings()
  const [zones, setZones] = React.useState<Array<string>>([])

  // Digests are timed to your zone; the first visit records the browser's.
  React.useEffect(() => {
    try {
      setZones(Intl.supportedValuesOf('timeZone'))
    } catch {
      setZones([])
    }
    const detected = detectedTimeZone()
    if (settings && !settings.timezone && detected) void update({ timezone: detected })
    // Once, on arrival.
  }, [])

  if (!settings) return null
  const zone = settings.timezone ?? 'UTC'

  return (
    <section id="email" aria-labelledby="email-heading" className="scroll-mt-28">
      <SectionLabel id="email-heading" className="px-4 pt-5 pb-1 sm:px-5">
        Email
      </SectionLabel>

      <SettingRow
        title="Digest"
        description={
          settings.digest === 'off' ? (
            'The best stories from your channels, people you follow and the front page, in your inbox.'
          ) : (
            <>
              {describeSchedule(settings.digest)}, {zone.replace(/_/g, ' ')} time. Mutes apply.{' '}
              <a
                href={`/api/digest/preview?frequency=${settings.digest}`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center font-semibold text-brand-text hover:underline"
              >
                Preview
                <ArrowUpRight className="size-3.5" aria-hidden />
              </a>
            </>
          )
        }
      >
        <SegmentedControl<DigestFrequency>
          aria-label="Digest"
          size="sm"
          className="w-56 shrink-0"
          value={settings.digest}
          onValueChange={(digest) => !saving && void update({ digest }, DIGEST_MESSAGES[digest])}
          options={[
            { value: 'off', label: 'Off' },
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
          ]}
        />
      </SettingRow>

      {settings.digest !== 'off' && zones.length > 0 && (
        <SettingRow title="Time zone" description="Digests arrive at 8 AM here.">
          {/* Styled like the segmented controls beside it; the native arrow is swapped for ours. */}
          <span className="relative w-56 shrink-0">
            <select
              aria-label="Time zone"
              value={zone}
              disabled={saving}
              onChange={(event) => void update({ timezone: event.target.value }, 'Time zone updated')}
              className="h-7 w-full cursor-pointer appearance-none truncate rounded-[10px] bg-fill pr-8 pl-3 text-caption-1 font-medium text-label transition-colors outline-none hover:bg-fill-strong focus-visible:shadow-[0_0_0_4px_var(--brand-tint)] disabled:opacity-50"
            >
              {(zones.includes(zone) ? zones : [zone, ...zones]).map((name) => (
                <option key={name} value={name}>
                  {name.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              strokeWidth={2.4}
              className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-label-secondary"
            />
          </span>
        </SettingRow>
      )}

      <SettingRow
        title="Activity emails"
        description="Replies, mentions, comments on your stories and new followers. At most one every 10 minutes."
      >
        <SegmentedControl
          aria-label="Activity emails"
          size="sm"
          className="w-56 shrink-0"
          value={settings.email ? 'on' : 'off'}
          onValueChange={(value) =>
            !saving &&
            void update(
              { email: value === 'on' },
              value === 'on' ? 'Activity emails on' : 'Activity emails off',
            )
          }
          options={[
            { value: 'on', label: 'On' },
            { value: 'off', label: 'Off' },
          ]}
        />
      </SettingRow>
    </section>
  )
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string
  description: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-separator px-4 py-4 sm:flex-row sm:items-center sm:px-5">
      <div className="min-w-0 flex-1">
        <h3 className="text-subhead font-semibold text-label">{title}</h3>
        <p className="text-footnote text-pretty text-label-secondary">{description}</p>
      </div>
      {children}
    </div>
  )
}

/* ─────────────────────────────────── Muted ─────────────────────────────────── */

const ADDABLE: Array<{ value: Exclude<MuteKind, 'channel'>; label: string; placeholder: string }> = [
  { value: 'keyword', label: 'Word', placeholder: 'A word in titles, like crypto' },
  { value: 'domain', label: 'Site', placeholder: 'A site, like example.com' },
  { value: 'topic', label: 'Topic', placeholder: 'A topic, like Blockchain' },
]

const GROUPS: Array<{ kind: MuteKind; title: string }> = [
  { kind: 'channel', title: 'Channels' },
  { kind: 'topic', title: 'Topics' },
  { kind: 'domain', title: 'Sites' },
  { kind: 'keyword', title: 'Words' },
]

function MutedSection() {
  const { mutes, setMute } = useMutes()
  const { byId } = useChannels()
  const [kind, setKind] = React.useState<Exclude<MuteKind, 'channel'>>('keyword')
  const [text, setText] = React.useState('')
  const [adding, setAdding] = React.useState(false)
  const option = ADDABLE.find((item) => item.value === kind)!

  const label = (mute: Mute) => {
    if (mute.kind === 'channel') return byId.get(mute.value)?.name ?? mute.value
    if (mute.kind === 'topic') return topicDisplayLabel(mute.value.replace(/-/g, ' '))
    return mute.value
  }

  const add = async () => {
    const value = normalizeMute(kind, text)
    if (!value) {
      toast.error(kind === 'domain' ? 'Enter a site like example.com.' : 'Enter at least two characters.')
      return
    }
    setAdding(true)
    const shown = kind === 'topic' ? topicDisplayLabel(text.trim()) : value
    if (await setMute(kind, text, shown, true)) setText('')
    setAdding(false)
  }

  return (
    <section id="muted" aria-labelledby="muted-heading" className="scroll-mt-28">
      <SectionLabel id="muted-heading" className="px-4 pt-6 pb-1 sm:px-5">
        Muted
      </SectionLabel>
      <p className="px-4 text-footnote text-pretty text-label-secondary sm:px-5">
        Hidden from Top, New, Show, Past, Following and your digests. Channel, topic and site pages still show
        everything. Mute a story’s site or channel from its <span className="font-semibold">⋯</span> menu.
      </p>

      <form
        className="flex flex-col gap-2 px-4 pt-4 sm:flex-row sm:px-5"
        onSubmit={(event) => {
          event.preventDefault()
          void add()
        }}
      >
        <SegmentedControl
          aria-label="What to mute"
          size="sm"
          className="h-11 w-full shrink-0 sm:w-56"
          value={kind}
          onValueChange={setKind}
          options={ADDABLE.map(({ value, label }) => ({ value, label }))}
        />
        <div className="flex flex-1 gap-2">
          <Input
            aria-label={option.placeholder}
            placeholder={option.placeholder}
            value={text}
            maxLength={kind === 'domain' ? 300 : 40}
            onChange={(event) => setText(event.target.value)}
            className="min-w-0 flex-1"
          />
          <Button type="submit" variant="primary" size="lg" loading={adding} disabled={!text.trim()}>
            <Plus />
            Mute
          </Button>
        </div>
      </form>

      {mutes.length === 0 ? (
        <div className="flex items-center gap-3 px-4 py-6 text-footnote text-label-secondary sm:px-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-fill-secondary text-label-tertiary">
            <EyeOff className="size-4" aria-hidden />
          </span>
          Nothing muted. Every story can reach your feeds.
        </div>
      ) : (
        <div className="space-y-4 px-4 pt-5 pb-6 sm:px-5">
          {GROUPS.map((group) => {
            const items = mutes.filter((mute) => mute.kind === group.kind)
            if (items.length === 0) return null
            return (
              <div key={group.kind}>
                <h3 className="text-footnote font-semibold text-label">{group.title}</h3>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {items.map((mute) => (
                    <li key={mute.value}>
                      <MuteChip
                        mute={mute}
                        label={label(mute)}
                        onRemove={() => void setMute(mute.kind, mute.value, label(mute), false)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function MuteChip({ mute, label, onRemove }: { mute: Mute; label: string; onRemove: () => void }) {
  const link =
    mute.kind === 'channel' ? (
      <Link to="/channels/$channelId" params={{ channelId: mute.value }} className="hover:text-brand-text">
        {label}
      </Link>
    ) : mute.kind === 'topic' ? (
      <Link to="/topics/$topicKey" params={{ topicKey: mute.value }} className="hover:text-brand-text">
        {label}
      </Link>
    ) : mute.kind === 'domain' ? (
      <Link to="/from/$domain" params={{ domain: mute.value }} className="hover:text-brand-text">
        {label}
      </Link>
    ) : (
      <span>“{label}”</span>
    )
  return (
    <span
      className={cn(
        'inline-flex h-8 items-center gap-1 rounded-full bg-fill-secondary pr-1 pl-3 text-footnote font-medium text-label',
      )}
    >
      {link}
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Unmute ${label}`}
        title={`Unmute ${label}`}
        onClick={onRemove}
        className="size-6"
      >
        <X />
      </Button>
    </span>
  )
}
