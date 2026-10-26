import * as React from 'react'
import { Command } from 'cmdk'
import { Popover } from 'radix-ui'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Channel } from '@/lib/types'
import { ChannelIcon, groupByCategory, useChannels } from './channel-parts'

const groupClass = cn(
  '[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:pb-1',
  '[&_[cmdk-group-heading]]:text-caption-1 [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-label-tertiary',
)

/** Name prefix beats name substring beats keyword or category match; null when nothing matches. */
function rank(channel: Channel, term: string): number | null {
  const name = channel.name.toLowerCase()
  if (name.startsWith(term)) return 0
  if (name.includes(term)) return 1
  const haystack = [channel.id, channel.category, ...channel.keywords].map((text) => text.toLowerCase())
  return haystack.some((text) => text.includes(term)) ? 2 : null
}

const itemClass =
  'flex h-10 cursor-default items-center gap-2.5 rounded-[10px] px-2.5 text-subhead text-label outline-none select-none data-[selected=true]:bg-fill-secondary'

/**
 * Searchable channel picker (a combobox): looks like the form's other fields,
 * opens a list grouped by category with a search box on top. `id` and the
 * aria attributes come from the surrounding Field.
 */
export function ChannelPicker({
  value,
  onChange,
  id,
  'aria-describedby': describedBy,
}: {
  value: string
  onChange: (channelId: string) => void
  id?: string
  'aria-describedby'?: string
}) {
  const { channels, byId } = useChannels()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const selected = value ? byId.get(value) : undefined
  const term = query.trim().toLowerCase()
  const results = term
    ? channels
        .map((channel) => ({ channel, score: rank(channel, term) }))
        .filter((item): item is { channel: Channel; score: number } => item.score !== null)
        .sort((a, b) => a.score - b.score)
        .map((item) => item.channel)
    : []

  React.useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const pick = (channelId: string) => {
    onChange(channelId)
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className="relative">
        <Popover.Trigger asChild>
          <button
            type="button"
            id={id}
            aria-describedby={describedBy}
            className={cn(
              'flex h-11 w-full items-center gap-2.5 rounded-control border border-transparent bg-fill-secondary pr-10 text-left text-callout transition-[background-color,border-color,box-shadow] outline-none hover:bg-fill focus-visible:border-brand/40 focus-visible:bg-surface focus-visible:shadow-[0_0_0_4px_var(--brand-tint)] data-[state=open]:border-brand/40 data-[state=open]:bg-surface data-[state=open]:shadow-[0_0_0_4px_var(--brand-tint)]',
              selected ? 'pl-3' : 'pl-3.5',
            )}
          >
            {selected ? (
              <>
                <ChannelIcon channel={selected} size={22} />
                <span className="truncate text-label">{selected.name}</span>
                <span className="truncate text-footnote text-label-tertiary">{selected.category}</span>
              </>
            ) : (
              <span className="text-label-tertiary">No channel</span>
            )}
          </button>
        </Popover.Trigger>
        {selected ? (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear channel"
            className="absolute top-1/2 right-3 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-label-tertiary/40 text-surface hover:bg-label-tertiary/60"
          >
            <X className="size-3" strokeWidth={3} />
          </button>
        ) : (
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-label-tertiary" />
        )}
      </div>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          style={{ width: 'var(--radix-popover-trigger-width)' }}
          className="z-50 animate-scale-in overflow-hidden rounded-[16px] glass-strong shadow-popover"
        >
          <Command loop shouldFilter={false} label="Choose a channel">
            <div className="flex items-center gap-2.5 border-b border-separator px-3.5">
              <Search className="size-4 shrink-0 text-label-tertiary" strokeWidth={2.2} aria-hidden />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search channels"
                className="h-11 min-w-0 flex-1 bg-transparent text-subhead text-label outline-none placeholder:text-label-tertiary"
              />
            </div>
            <Command.List className="max-h-[min(50vh,320px)] scroll-py-1.5 overflow-y-auto overscroll-contain p-1.5">
              <Command.Empty className="px-3 py-6 text-center text-footnote text-label-secondary">
                No channel matches “{query.trim()}”.
              </Command.Empty>
              {!term && (
                <Command.Item value="no channel none" onSelect={() => pick('')} className={itemClass}>
                  <span className="grid size-[22px] place-items-center rounded-[6px] bg-fill text-label-tertiary">
                    <X className="size-3" strokeWidth={2.6} />
                  </span>
                  <span className="flex-1 text-label-secondary">No channel</span>
                  {!value && <Check className="size-4 text-brand-text" />}
                </Command.Item>
              )}
              {term
                ? results.map((channel) => (
                    <ChannelItem
                      key={channel.id}
                      channel={channel}
                      selected={channel.id === value}
                      onPick={pick}
                      showCategory
                    />
                  ))
                : groupByCategory(channels).map((group) => (
                    <Command.Group key={group.category} heading={group.category} className={groupClass}>
                      {group.channels.map((channel) => (
                        <ChannelItem
                          key={channel.id}
                          channel={channel}
                          selected={channel.id === value}
                          onPick={pick}
                        />
                      ))}
                    </Command.Group>
                  ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function ChannelItem({
  channel,
  selected,
  onPick,
  showCategory,
}: {
  channel: Channel
  selected: boolean
  onPick: (channelId: string) => void
  showCategory?: boolean
}) {
  return (
    <Command.Item value={channel.id} onSelect={() => onPick(channel.id)} className={itemClass}>
      <ChannelIcon channel={channel} size={22} />
      <span className="flex-1 truncate">{channel.name}</span>
      {showCategory && <span className="text-caption-1 text-label-tertiary">{channel.category}</span>}
      {selected && <Check className="size-4 text-brand-text" />}
    </Command.Item>
  )
}
