import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowUp,
  BookOpen,
  Check,
  Inbox,
  MoreHorizontal,
  PenLine,
  Plus,
  Share,
  Info,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { SITE_URL, seo } from '@/lib/seo'
import { useTheme, type ThemePreference } from '@/lib/theme'
import type { Post } from '@/lib/types'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, List, SectionLabel } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Callout, Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { EmptyState, Kbd, Skeleton } from '@/components/ui/misc'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { ChannelPicker } from '@/components/channels/channel-picker'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip } from '@/components/ui/tooltip'
import { PostRow } from '@/components/feed/post-row'
import { Logo, LogoMark } from '@/components/logo'
import { VoteControl } from '@/components/vote-control'

export const Route = createFileRoute('/_app/design')({
  head: () => ({
    meta: seo({
      title: 'Design System - Refetch',
      description: 'Tokens, typography and components that make up the Refetch interface.',
      url: `${SITE_URL}/design`,
      noindex: true,
    }),
  }),
  component: DesignSystemPage,
})

const SECTIONS = [
  ['foundations', 'Foundations'],
  ['color', 'Color'],
  ['typography', 'Typography'],
  ['buttons', 'Buttons'],
  ['forms', 'Forms'],
  ['controls', 'Controls'],
  ['content', 'Content'],
  ['feedback', 'Feedback'],
  ['overlays', 'Overlays'],
] as const

function DesignSystemPage() {
  const { preference, setPreference } = useTheme()
  return (
    <div className="mx-auto max-w-4xl pb-16">
      <header className="mb-8 animate-rise-in px-1">
        <p className="mb-0.5 text-footnote font-semibold text-brand-text">Refetch UI</p>
        <h1 className="text-title-1 text-label sm:text-large-title">Design System</h1>
        <p className="mt-1.5 max-w-2xl text-subhead text-pretty text-label-secondary">
          The tokens and components behind Refetch, inspired by Apple’s Human Interface Guidelines, built on
          our purple. Everything here is live, adapts to light and dark mode, and lives in{' '}
          <code className="rounded-md bg-fill px-1.5 py-0.5 font-mono text-footnote">src/components/ui</code>.
          See <code className="rounded-md bg-fill px-1.5 py-0.5 font-mono text-footnote">DESIGN.md</code> for
          usage guidelines.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <SegmentedControl<ThemePreference>
            aria-label="Preview appearance"
            className="w-64"
            value={preference}
            onValueChange={setPreference}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'Auto' },
            ]}
          />
          <nav aria-label="Sections" className="flex flex-wrap gap-1.5">
            {SECTIONS.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="rounded-full bg-fill-secondary px-3 py-1 text-footnote font-medium text-label-secondary transition-colors hover:bg-fill hover:text-label"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="space-y-12">
        <Foundations />
        <Colors />
        <Typography />
        <Buttons />
        <Forms />
        <Controls />
        <Content />
        <Feedback />
        <Overlays />
      </div>
    </div>
  )
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20">
      <h2 id={`${id}-title`} className="px-1 text-title-2 text-label">
        {title}
      </h2>
      <p className="mt-1 mb-4 px-1 text-subhead text-pretty text-label-secondary">{description}</p>
      {children}
    </section>
  )
}

function Demo({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={className ?? 'p-5'}>
      <SectionLabel className="mb-4 px-0">{label}</SectionLabel>
      {children}
    </Card>
  )
}

/* ─────────────────────────────── Foundations ─────────────────────────────── */

function Foundations() {
  return (
    <Section
      id="foundations"
      title="Foundations"
      description="Grouped backgrounds, rounded surfaces, frosted materials and soft elevation. Content leads; chrome recedes."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Demo label="Brand">
          <div className="flex items-center gap-5">
            <LogoMark className="size-14" />
            <Logo className="h-8 w-auto" />
          </div>
          <p className="mt-4 text-footnote text-label-secondary">
            Always the original Refetch purple, <code className="font-mono">#4e1cb3</code> (
            <code className="font-mono">--logo</code>), in every theme. The wordmark turns white in dark mode.
          </p>
        </Demo>
        <Demo label="Materials">
          <div className="relative h-36 overflow-hidden rounded-2xl bg-surface-secondary bg-[radial-gradient(circle_at_20%_30%,#7c3aed_0,transparent_45%),radial-gradient(circle_at_85%_70%,#ff7a8a_0,transparent_40%),radial-gradient(circle_at_60%_10%,#5ac8fa_0,transparent_35%)]">
            <div className="absolute inset-x-3 top-3 flex items-center justify-between rounded-xl glass px-3 py-2">
              <span className="text-footnote font-semibold text-label">.glass</span>
              <span className="text-caption-1 text-label-secondary">navigation bar</span>
            </div>
            <div className="absolute inset-x-3 bottom-3 flex items-center gap-2.5">
              <div className="liquid-glass relative flex h-12 flex-1 items-center justify-between rounded-full px-4">
                <span className="text-footnote font-semibold text-label">.liquid-glass</span>
                <span className="text-caption-1 text-label-secondary">tab bar</span>
              </div>
              <div className="liquid-glass relative grid size-12 place-items-center rounded-full text-brand-text">
                <Plus className="size-5" strokeWidth={2.4} />
              </div>
            </div>
          </div>
        </Demo>
        <Demo label="Radii">
          <div className="flex items-end gap-3">
            {[
              ['control', 'rounded-control', 'size-12'],
              ['card', 'rounded-card', 'size-14'],
              ['widget', 'rounded-widget', 'size-16'],
              ['full', 'rounded-full', 'size-12'],
            ].map(([name, radius, size]) => (
              <div key={name} className="text-center">
                <div className={`${size} ${radius} bg-brand-tint ring-1 ring-brand/20`} />
                <p className="mt-1.5 font-mono text-caption-2 text-label-tertiary">{name}</p>
              </div>
            ))}
          </div>
        </Demo>
        <Demo label="Elevation">
          <div className="grid grid-cols-3 gap-3">
            {['shadow-card', 'shadow-raised', 'shadow-popover'].map((shadow) => (
              <div
                key={shadow}
                className={`grid h-16 place-items-center rounded-xl bg-surface-raised ${shadow}`}
              >
                <span className="font-mono text-caption-2 text-label-tertiary">
                  {shadow.replace('shadow-', '')}
                </span>
              </div>
            ))}
          </div>
        </Demo>
      </div>
    </Section>
  )
}

/* ─────────────────────────────────── Color ─────────────────────────────────── */

const COLOR_GROUPS: Array<{ title: string; tokens: Array<[string, string]> }> = [
  {
    title: 'Brand',
    tokens: [
      ['brand', 'Primary actions, selection'],
      ['brand-hover', 'Hover state'],
      ['brand-2', 'Gradient partner'],
      ['brand-text', 'Links & accents on surfaces'],
      ['brand-tint', 'Tinted backgrounds'],
    ],
  },
  {
    title: 'Surfaces',
    tokens: [
      ['bg', 'Grouped page background'],
      ['surface', 'Cards & lists'],
      ['surface-secondary', 'Nested areas'],
      ['fill', 'Controls & tracks'],
      ['separator', 'Hairlines'],
    ],
  },
  {
    title: 'Labels',
    tokens: [
      ['label', 'Primary text'],
      ['label-secondary', 'Supporting text'],
      ['label-tertiary', 'Metadata'],
      ['label-quaternary', 'Disabled & placeholders'],
    ],
  },
  {
    title: 'Feedback',
    tokens: [
      ['up', 'Upvotes & success'],
      ['up-tint', 'Success background'],
      ['down', 'Downvotes & destructive'],
      ['down-tint', 'Error background'],
      ['warning', 'Warnings'],
    ],
  },
]

function Colors() {
  return (
    <Section
      id="color"
      title="Color"
      description="Semantic tokens, never raw hex values. Each token has a light and dark value and is available as a Tailwind utility (bg-*, text-*, border-*)."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {COLOR_GROUPS.map((group) => (
          <Demo key={group.title} label={group.title} className="p-2">
            <ul className="-mt-2">
              {group.tokens.map(([token, usage]) => (
                <li key={token} className="flex items-center gap-3 rounded-xl px-3 py-2">
                  <span
                    className="size-9 shrink-0 rounded-[10px] ring-1 ring-black/5 ring-inset dark:ring-white/10"
                    style={{ background: `var(--${token})` }}
                  />
                  <div className="min-w-0">
                    <p className="font-mono text-footnote font-medium text-label">--{token}</p>
                    <p className="truncate text-caption-1 text-label-secondary">{usage}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Demo>
        ))}
      </div>
    </Section>
  )
}

/* ───────────────────────────────── Typography ───────────────────────────────── */

const TYPE_SCALE: Array<[string, string, string]> = [
  ['text-large-title', '34 / Bold', 'Top Stories'],
  ['text-title-1', '28 / Bold', 'Submit a story'],
  ['text-title-2', '22 / Bold', 'The Curse of Soldered RAM'],
  ['text-title-3', '20 / Semibold', 'Comments'],
  ['text-headline', '17 / Semibold', 'Join the discussion'],
  ['text-body', '17 / Regular', 'Your daily drop of curated tech news.'],
  ['text-callout', '16 / Regular', 'Signal over noise. Transparent. Community-driven.'],
  ['text-subhead', '15 / Regular', 'Default UI text and comment bodies.'],
  ['text-footnote', '13 / Regular', 'train-it.eu · 2h ago · Scout'],
  ['text-caption-1', '12 / Regular', 'Last 24 hours'],
  ['text-caption-2', '11 / Regular', 'SPONSORED'],
]

function Typography() {
  return (
    <Section
      id="typography"
      title="Typography"
      description="SF Pro on Apple devices, Inter everywhere else. Numbers that change (votes, stats) use SF Pro Rounded with tabular figures."
    >
      <List style={{ '--list-inset': '1.25rem' } as React.CSSProperties}>
        {TYPE_SCALE.map(([token, spec, sample]) => (
          <li
            key={token}
            className="relative flex flex-col gap-1 px-5 py-3.5 not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-5 not-first:before:h-px not-first:before:bg-separator sm:flex-row sm:items-baseline sm:gap-6"
          >
            <div className="w-40 shrink-0">
              <p className="font-mono text-caption-1 text-label">{token}</p>
              <p className="text-caption-2 text-label-tertiary">{spec}</p>
            </div>
            <p className={`${token} min-w-0 truncate text-label`}>{sample}</p>
          </li>
        ))}
      </List>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Demo label="Rounded numerals">
          <p className="font-rounded text-large-title text-label tabular">1,284</p>
          <p className="text-footnote text-label-secondary">
            <code className="font-mono">font-rounded tabular</code>
          </p>
        </Demo>
        <Demo label="Gradient accent">
          <p className="brand-gradient-text text-title-1">Signal over noise.</p>
          <p className="text-footnote text-label-secondary">
            <code className="font-mono">brand-gradient-text</code>. Use sparingly, for brand moments only.
          </p>
        </Demo>
      </div>
    </Section>
  )
}

/* ─────────────────────────────────── Buttons ─────────────────────────────────── */

function Buttons() {
  const variants = [
    'primary',
    'secondary',
    'tinted',
    'plain',
    'ghost',
    'outline',
    'destructive',
    'dark',
  ] as const
  return (
    <Section
      id="buttons"
      title="Buttons"
      description="Capsule shapes with a gentle press. One primary action per view; secondary and tinted for supporting actions; plain for inline ones."
    >
      <div className="grid gap-4">
        <Demo label="Variants">
          <div className="flex flex-wrap gap-2.5">
            {variants.map((variant) => (
              <Button key={variant} variant={variant}>
                {variant.charAt(0).toUpperCase() + variant.slice(1)}
              </Button>
            ))}
          </div>
        </Demo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Demo label="Sizes">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant="primary" size="xs">
                Extra small
              </Button>
              <Button variant="primary" size="sm">
                Small
              </Button>
              <Button variant="primary" size="md">
                Medium
              </Button>
              <Button variant="primary" size="lg">
                Large
              </Button>
            </div>
          </Demo>
          <Demo label="With icons & states">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant="primary">
                <BookOpen />
                Read article
              </Button>
              <Button variant="secondary">
                <Share />
                Share
              </Button>
              <Button variant="primary" loading>
                Saving
              </Button>
              <Button variant="secondary" disabled>
                Disabled
              </Button>
            </div>
          </Demo>
        </div>
        <Demo label="Icon buttons">
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="primary" size="icon" aria-label="Send">
              <ArrowUp strokeWidth={2.75} />
            </Button>
            <Button variant="primary" size="icon-sm" aria-label="Add">
              <Plus strokeWidth={2.5} />
            </Button>
            <Button variant="secondary" size="icon" aria-label="More">
              <MoreHorizontal />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete"
              className="hover:bg-down-tint hover:text-down"
            >
              <Trash2 />
            </Button>
            <Button variant="tinted" size="icon-lg" aria-label="Compose">
              <PenLine />
            </Button>
          </div>
        </Demo>
      </div>
    </Section>
  )
}

/* ──────────────────────────────────── Forms ──────────────────────────────────── */

function Forms() {
  const [title, setTitle] = React.useState('The Curse of Soldered RAM')
  const [channel, setChannel] = React.useState('rust')
  return (
    <Section
      id="forms"
      title="Forms"
      description="Filled fields that lift to the surface color on focus with a soft brand halo. Labels sit above, hints and errors below."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Demo label="Fields">
          <div className="space-y-4">
            <Field label="Link" htmlFor="ds-url" hint="Paste the URL of the original article.">
              <Input placeholder="https://" />
            </Field>
            <Field
              label="Title"
              htmlFor="ds-title"
              aside={<span className="text-caption-1 text-label-tertiary tabular">{title.length}/300</span>}
            >
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </Field>
            <Field label="Email" htmlFor="ds-email" error="Enter a valid email address.">
              <Input defaultValue="ada@" />
            </Field>
            <Field label="Comment" htmlFor="ds-comment" optional>
              <Textarea rows={3} placeholder="Grows as you type…" />
            </Field>
            <Field
              label="Channel"
              htmlFor="ds-channel"
              optional
              hint="Searchable picker, grouped by category."
            >
              <ChannelPicker value={channel} onChange={setChannel} />
            </Field>
          </div>
        </Demo>
        <Demo label="Callouts">
          <div className="space-y-3">
            <Callout tone="danger">Incorrect email or password.</Callout>
            <Callout tone="warning">You’re close to the daily submission limit.</Callout>
            <Callout tone="success" icon={<Check className="mt-px size-4 shrink-0" />}>
              Story submitted. It joins the feeds after review.
            </Callout>
            <Callout tone="info" icon={<Info className="mt-px size-4 shrink-0" />}>
              Summaries are generated by our open-source curator.
            </Callout>
          </div>
        </Demo>
      </div>
    </Section>
  )
}

/* ─────────────────────────────────── Controls ─────────────────────────────────── */

function Controls() {
  const [range, setRange] = React.useState<'24h' | '30d' | '1y'>('24h')
  const [sort, setSort] = React.useState<'oldest' | 'newest' | 'top'>('top')
  return (
    <Section
      id="controls"
      title="Controls"
      description="Segmented controls switch views in place; vote controls give instant, optimistic feedback with rolling numerals."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Demo label="Segmented control">
          <div className="space-y-3">
            <SegmentedControl
              aria-label="Range"
              value={range}
              onValueChange={setRange}
              options={[
                { value: '24h', label: '24H' },
                { value: '30d', label: '30D' },
                { value: '1y', label: '1Y' },
              ]}
            />
            <SegmentedControl
              aria-label="Sort"
              size="sm"
              value={sort}
              onValueChange={setSort}
              options={[
                { value: 'oldest', label: 'Oldest' },
                { value: 'newest', label: 'Newest' },
                { value: 'top', label: 'Top' },
              ]}
            />
          </div>
        </Demo>
        <Demo label="Votes (try them)">
          <div className="flex items-center gap-8">
            <VoteControl type="post" id="design-a" initial={{ vote: null, count: 42 }} demo />
            <VoteControl type="post" id="design-b" initial={{ vote: 'up', count: 128 }} size="lg" demo />
            <VoteControl
              type="comment"
              id="design-c"
              initial={{ vote: null, count: 7 }}
              orientation="horizontal"
              size="sm"
              demo
            />
          </div>
        </Demo>
      </div>
    </Section>
  )
}

/* ─────────────────────────────────── Content ─────────────────────────────────── */

const SAMPLE_POSTS: Array<Post> = [
  {
    id: 'design-post-1',
    title: 'Boosting Computer Vision with SIMD on a $2 Microcontroller',
    description: '',
    link: 'https://example.com/simd',
    domain: 'example.com',
    type: 'link',
    userId: '0',
    userName: 'Scout',
    count: 24,
    countComments: 6,
    readingTime: 5,
    createdAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
    channel: 'rust',
    vote: 'up',
  },
  {
    id: 'design-post-2',
    title: 'Introducing a tiny open-source database for edge functions',
    description: '',
    link: 'https://example.org/launch',
    domain: 'example.org',
    type: 'show',
    userId: 'u1',
    userName: 'Ada Lovelace',
    count: 11,
    countComments: 2,
    readingTime: 3,
    createdAt: new Date(Date.now() - 50 * 60_000).toISOString(),
    channel: 'databases',
    vote: null,
  },
]

function Content() {
  return (
    <Section
      id="content"
      title="Content"
      description="Inset grouped lists for collections, cards for everything else. Separators start at the content edge, like iOS."
    >
      <div className="space-y-4">
        <List style={{ '--list-inset': '5rem' } as React.CSSProperties}>
          {SAMPLE_POSTS.map((post, index) => (
            <PostRow key={post.id} post={post} rank={index + 1} demo />
          ))}
        </List>
        <div className="grid gap-4 sm:grid-cols-3">
          <Demo label="Badges">
            <div className="flex flex-wrap gap-2">
              <Badge variant="brand">Show RF</Badge>
              <Badge variant="neutral">OP</Badge>
              <Badge variant="solid">New</Badge>
              <Badge variant="success">+12</Badge>
              <Badge variant="danger">Removed</Badge>
              <Badge variant="outline">Draft</Badge>
            </div>
          </Demo>
          <Demo label="Avatars">
            <div className="flex -space-x-2">
              {['Ada Lovelace', 'Grace Hopper', 'Linus T', 'Margaret Hamilton', 'Scout'].map((name) => (
                <Avatar key={name} name={name} size={36} className="ring-2 ring-surface" />
              ))}
            </div>
          </Demo>
          <Demo label="Keyboard">
            <p className="flex items-center gap-1.5 text-footnote text-label-secondary">
              <Kbd>⌘</Kbd>
              <Kbd>↩</Kbd>
              to post a comment
            </p>
          </Demo>
        </div>
        <Card>
          <EmptyState
            icon={<Inbox />}
            title="Empty states"
            description="A friendly icon, a short title, one sentence, and at most one action."
            action={
              <Button variant="primary" size="md">
                <PenLine />
                Submit a story
              </Button>
            }
          />
        </Card>
      </div>
    </Section>
  )
}

/* ─────────────────────────────────── Feedback ─────────────────────────────────── */

function Feedback() {
  return (
    <Section
      id="feedback"
      title="Feedback"
      description="Activity indicators for work in progress, shimmering skeletons for loading layouts, and frosted toasts for results."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Demo label="Activity indicator">
          <div className="flex items-center gap-5 text-label-secondary">
            <Spinner />
            <Spinner className="size-6" />
            <Spinner className="size-8 text-brand-text" />
          </div>
        </Demo>
        <Demo label="Skeleton">
          <div className="space-y-2.5">
            <Skeleton className="h-4 w-5/6 rounded-full" />
            <Skeleton className="h-4 w-2/3 rounded-full" />
            <Skeleton className="h-3 w-1/2 rounded-full" />
          </div>
        </Demo>
        <Demo label="Toasts">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => toast.success('Link copied')}>
              Success
            </Button>
            <Button
              size="sm"
              onClick={() => toast.error('Couldn’t save your vote', { description: 'Try again.' })}
            >
              Error
            </Button>
            <Button size="sm" onClick={() => toast('Signed out', { description: 'See you soon.' })}>
              Neutral
            </Button>
          </div>
        </Demo>
      </div>
    </Section>
  )
}

/* ─────────────────────────────────── Overlays ─────────────────────────────────── */

function Overlays() {
  const [confirming, setConfirming] = React.useState(false)
  return (
    <Section
      id="overlays"
      title="Overlays"
      description="Menus, alerts and tooltips share the same thick frosted material and spring in from their origin."
    >
      <Demo label="Menus, alerts & tooltips">
        <div className="flex flex-wrap items-center gap-2.5">
          <Menu>
            <MenuTrigger asChild>
              <Button variant="secondary">
                <MoreHorizontal />
                Open menu
              </Button>
            </MenuTrigger>
            <MenuContent align="start">
              <MenuItem>
                <Share />
                Share
              </MenuItem>
              <MenuItem>
                <BookOpen />
                Read article
              </MenuItem>
              <MenuSeparator />
              <MenuItem destructive>
                <Trash2 className="!text-current" />
                Delete
              </MenuItem>
            </MenuContent>
          </Menu>
          <Button variant="destructive" onClick={() => setConfirming(true)}>
            <Trash2 />
            Show alert
          </Button>
          <Tooltip content="Tooltips explain icons and truncated text.">
            <Button variant="ghost">Hover me</Button>
          </Tooltip>
        </div>
      </Demo>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete this story?"
        description="It will be removed from Refetch for everyone. This can’t be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          setConfirming(false)
          toast('Nothing was deleted. This is a demo.')
        }}
      />
    </Section>
  )
}
