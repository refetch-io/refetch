import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { peopleQuery, unreadQuery } from '@/lib/queries'
import { useSession } from '@/lib/session'
import type { ConversationSummary, PersonSummary } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Avatar } from '../ui/avatar'
import { Input } from '../ui/input'
import { Spinner } from '../ui/spinner'

/** One photo for direct conversations, two overlapping ones for groups. */
export function ConversationAvatar({
  conversation,
  viewerId,
  size = 44,
}: {
  conversation: ConversationSummary
  viewerId: string
  size?: number
}) {
  const others = conversation.members.filter((member) => member.id !== viewerId)
  if (conversation.type === 'direct' || others.length < 2) {
    const person = others[0] ?? conversation.members[0]
    return <Avatar name={person?.name ?? conversation.title} userId={person?.id} size={size} />
  }
  const small = Math.round(size * 0.68)
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }} aria-hidden>
      <Avatar name={others[1].name} userId={others[1].id} size={small} className="absolute top-0 right-0" />
      <Avatar
        name={others[0].name}
        userId={others[0].id}
        size={small}
        className="absolute bottom-0 left-0 ring-2 ring-surface"
      />
    </span>
  )
}

/** Unread messages across conversations, for the nav. Polls while signed in. */
export function useUnreadCount() {
  const { user } = useSession()
  const { data } = useQuery({ ...unreadQuery(user?.id ?? ''), enabled: Boolean(user) })
  return user ? (data ?? 0) : 0
}

export function UnreadBadge({
  count,
  label = 'unread',
  className,
}: {
  count: number
  /** Read after the count by screen readers. */
  label?: string
  className?: string
}) {
  if (count <= 0) return null
  return (
    <span
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-down px-1 font-rounded text-[11px] leading-none font-bold text-white tabular',
        className,
      )}
    >
      <span className="sr-only">, </span>
      {count > 99 ? '99+' : count}
      <span className="sr-only"> {label}</span>
    </span>
  )
}

/**
 * Search people by name and collect a selection (chips). Used to start
 * conversations, add group members and share stories.
 */
export function PeoplePicker({
  selected,
  onChange,
  exclude = [],
  max,
  autoFocus,
}: {
  selected: Array<PersonSummary>
  onChange: (people: Array<PersonSummary>) => void
  exclude?: Array<string>
  max?: number
  autoFocus?: boolean
}) {
  const [query, setQuery] = React.useState('')
  const [debounced, setDebounced] = React.useState('')
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 200)
    return () => clearTimeout(id)
  }, [query])
  const search = useQuery(peopleQuery(debounced))
  const chosen = new Set(selected.map((person) => person.id))
  const hidden = new Set(exclude)
  const results = debounced.length >= 2 ? (search.data ?? []).filter((person) => !hidden.has(person.id)) : []
  const full = max !== undefined && selected.length >= max

  const toggle = (person: PersonSummary) => {
    if (chosen.has(person.id)) onChange(selected.filter((item) => item.id !== person.id))
    else if (!full) {
      onChange([...selected, person])
      setQuery('')
    }
  }

  return (
    <div>
      {selected.length > 0 && (
        <ul role="list" aria-label="Selected" className="mb-3 flex flex-wrap gap-1.5">
          {selected.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => toggle(person)}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-tint pr-2 pl-1 text-footnote font-semibold text-brand-text"
                aria-label={`Remove ${person.name}`}
              >
                <Avatar name={person.name} userId={person.id} size={24} />
                {person.name}
                <X className="size-3.5" strokeWidth={2.6} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-label-tertiary"
          strokeWidth={2.2}
        />
        <Input
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={full ? 'Group is full' : 'Search people by name'}
          disabled={full}
          aria-label="Search people"
          className="h-10 pr-9 pl-10 [&::-webkit-search-cancel-button]:hidden"
        />
        {search.isFetching && debounced.length >= 2 && (
          <Spinner className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-label-tertiary" />
        )}
      </div>
      {debounced.length >= 2 && (
        <ul role="list" className="mt-2">
          {results.length === 0 && !search.isFetching ? (
            <li className="px-1 py-3 text-footnote text-label-secondary">
              No one matches “{debounced}”. People appear here once they’ve signed in and accept messages.
            </li>
          ) : (
            results.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => toggle(person)}
                  aria-pressed={chosen.has(person.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-fill-secondary"
                >
                  <Avatar name={person.name} userId={person.id} size={36} />
                  <span className="min-w-0 flex-1 truncate text-subhead font-medium text-label">
                    {person.name}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      'grid size-5 place-items-center rounded-full border-2 transition-colors',
                      chosen.has(person.id) ? 'border-brand bg-brand' : 'border-separator-strong',
                    )}
                  >
                    {chosen.has(person.id) && <span className="size-1.5 rounded-full bg-white" />}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
