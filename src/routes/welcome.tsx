import * as React from 'react'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Check, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { completeOnboarding } from '@/api/profiles'
import { channelDirectoryQuery, onboardingQuery } from '@/lib/queries'
import { safeRedirect } from '@/lib/redirect'
import { seo } from '@/lib/seo'
import type { Channel, SuggestedPerson } from '@/lib/types'
import { cn, pluralize } from '@/lib/utils'
import { ChannelIcon, groupByCategory, useChannels } from '@/components/channels/channel-parts'
import { Logo } from '@/components/logo'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { SectionLabel } from '@/components/ui/card'

export const Route = createFileRoute('/welcome')({
  validateSearch: z.object({ redirect: z.string().max(512).optional().catch(undefined) }),
  beforeLoad: ({ context, location }) => {
    if (!context.user) throw redirect({ to: '/signin', search: { redirect: location.href } })
    return { user: context.user }
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(onboardingQuery(context.user.id)),
      context.queryClient.ensureQueryData(channelDirectoryQuery(context.user.id)),
    ]),
  head: () => ({ meta: seo({ title: 'Welcome - Refetch', noindex: true }) }),
  component: WelcomePage,
})

function toggle(set: Set<string>, id: string) {
  const next = new Set(set)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

function WelcomePage() {
  const { user } = Route.useRouteContext()
  const search = Route.useSearch()
  const router = useRouter()
  const queryClient = useQueryClient()
  const save = useServerFn(completeOnboarding)
  const { data: suggestions } = useSuspenseQuery(onboardingQuery(user.id))
  const { channels, byId, joined } = useChannels()

  const [pickedChannels, setPickedChannels] = React.useState(
    () => new Set([...(suggestions?.channels.selected ?? []), ...joined].filter((id) => byId.has(id))),
  )
  const [pickedPeople, setPickedPeople] = React.useState(
    () => new Set((suggestions?.people ?? []).filter((person) => person.featured).map((person) => person.id)),
  )
  const [showAll, setShowAll] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const recommendedIds = [
    ...(suggestions?.channels.selected ?? []),
    ...(suggestions?.channels.suggested ?? []),
  ]
  const recommended = recommendedIds.map((id) => byId.get(id)).filter((c): c is Channel => Boolean(c))
  const others = channels.filter((channel) => !recommendedIds.includes(channel.id))
  const destination = safeRedirect(search.redirect)
  const next = destination === '/' ? '/following' : destination

  const finish = async () => {
    setSaving(true)
    try {
      const result = await save({
        data: {
          channelIds: [...pickedChannels].filter((id) => !joined.has(id)),
          userIds: [...pickedPeople],
        },
      })
      if (!result.ok) toast.error(result.error)
      else toast.success('You’re all set', { description: 'Your Following feed is ready.' })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['channels'] }),
        queryClient.invalidateQueries({ queryKey: ['following'] }),
      ])
      router.history.push(next)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-dvh pb-32">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
        <Link to="/" aria-label="Refetch home">
          <Logo className="h-[22px] w-auto" />
        </Link>
        <Button asChild variant="plain" size="sm">
          <Link to={next}>Skip for now</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-3xl animate-rise-in px-5">
        <p className="mt-6 text-footnote font-semibold text-brand-text">
          Welcome, {user.name.split(' ')[0] || 'friend'}
        </p>
        <h1 className="mt-1 text-title-1 text-balance text-label sm:text-large-title">Make Refetch yours</h1>
        <p className="mt-2 max-w-xl text-subhead text-pretty text-label-secondary">
          Pick the channels and people you want to hear from. Their best stories gather in your Following
          feed. You can change this any time.
        </p>

        <section aria-labelledby="pick-channels" className="mt-10">
          <SectionLabel id="pick-channels" className="mb-3">
            Recommended channels
          </SectionLabel>
          <ChannelGrid
            channels={recommended}
            picked={pickedChannels}
            onToggle={(id) => setPickedChannels((set) => toggle(set, id))}
          />
          {showAll ? (
            <div className="mt-8 space-y-8">
              {groupByCategory(others).map((group) => (
                <div key={group.category}>
                  <SectionLabel className="mb-3">{group.category}</SectionLabel>
                  <ChannelGrid
                    channels={group.channels}
                    picked={pickedChannels}
                    onToggle={(id) => setPickedChannels((set) => toggle(set, id))}
                  />
                </div>
              ))}
            </div>
          ) : (
            others.length > 0 && (
              <Button variant="plain" size="sm" className="mt-3" onClick={() => setShowAll(true)}>
                <ChevronDown />
                Show all {channels.length} channels
              </Button>
            )
          )}
        </section>

        {suggestions && suggestions.people.length > 0 && (
          <section aria-labelledby="pick-people" className="mt-10">
            <SectionLabel id="pick-people" className="mb-3">
              People to follow
            </SectionLabel>
            <ul role="list" className="overflow-hidden rounded-card bg-surface shadow-card">
              {suggestions.people.map((person, index) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  picked={pickedPeople.has(person.id)}
                  divider={index > 0}
                  onToggle={() => setPickedPeople((set) => toggle(set, person.id))}
                />
              ))}
            </ul>
          </section>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-glass-border glass pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3">
          <p className="min-w-0 flex-1 truncate text-footnote text-label-secondary tabular">
            {pluralize(pickedChannels.size, 'channel')} · {pluralize(pickedPeople.size, 'person', 'people')}
          </p>
          <Button variant="primary" size="lg" loading={saving} onClick={() => void finish()}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}

function ChannelGrid({
  channels,
  picked,
  onToggle,
}: {
  channels: Array<Channel>
  picked: Set<string>
  onToggle: (id: string) => void
}) {
  return (
    <ul role="list" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {channels.map((channel) => {
        const active = picked.has(channel.id)
        return (
          <li key={channel.id}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(channel.id)}
              className={cn(
                'flex w-full pressable items-center gap-3 rounded-card bg-surface p-3 text-left shadow-card transition-shadow',
                active ? 'ring-2 ring-brand' : 'hover:shadow-raised',
              )}
            >
              <ChannelIcon channel={channel} size={36} />
              <span className="min-w-0 flex-1 truncate text-subhead font-semibold text-label">
                {channel.name}
              </span>
              <Check
                aria-hidden
                className={cn(
                  'size-5 shrink-0 rounded-full p-0.5 transition-colors',
                  active ? 'bg-brand text-on-brand' : 'bg-fill text-transparent',
                )}
                strokeWidth={3}
              />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function PersonRow({
  person,
  picked,
  divider,
  onToggle,
}: {
  person: SuggestedPerson
  picked: boolean
  divider: boolean
  onToggle: () => void
}) {
  return (
    <li className={cn(divider && 'border-t border-separator')}>
      <button
        type="button"
        aria-pressed={picked}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-fill-secondary"
      >
        <Avatar name={person.name} userId={person.id} size={40} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-subhead font-semibold text-label">{person.name}</span>
          <span className="block truncate text-caption-1 text-label-secondary">{person.reason}</span>
        </span>
        <span
          className={cn(
            'inline-flex h-8 min-w-[6.5rem] items-center justify-center gap-1.5 rounded-full px-3 text-footnote font-semibold transition-colors',
            picked ? 'bg-fill text-label' : 'bg-brand text-on-brand',
          )}
        >
          {picked && <Check className="size-4" strokeWidth={2.6} />}
          {picked ? 'Following' : 'Follow'}
        </span>
      </button>
    </li>
  )
}
