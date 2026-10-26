import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ArrowRight, BadgeCheck, ChevronDown, Link2, ScanSearch, Type } from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'
import { submitStory } from '@/api/content'
import { LIMITS } from '@/lib/constants'
import { SITE_URL, seo } from '@/lib/seo'
import { hostnameOf, isHttpUrl } from '@/lib/url'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Callout, Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Favicon } from '@/components/favicon'
import { ChannelIcon, groupByCategory, useChannels } from '@/components/channels/channel-parts'

export const Route = createFileRoute('/_app/submit')({
  validateSearch: z.object({ channel: z.string().max(64).optional().catch(undefined) }),
  beforeLoad: ({ context, location }) => {
    if (!context.user) throw redirect({ to: '/signin', search: { redirect: location.href } })
  },
  head: () => ({
    meta: seo({
      title: 'Submit - Refetch',
      description: 'Share a story with the Refetch community.',
      url: `${SITE_URL}/submit`,
      noindex: true,
    }),
  }),
  component: SubmitPage,
})

const TIPS = [
  { icon: Link2, title: 'Link to the source', text: 'Share the original article, not a summary of it.' },
  {
    icon: Type,
    title: 'Keep the title honest',
    text: 'Use the original headline. No clickbait or editorializing.',
  },
  {
    icon: ScanSearch,
    title: 'Our AI does the rest',
    text: 'New stories are reviewed, tagged and summarized within minutes, then join the feeds.',
  },
]

function SubmitPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const submit = useServerFn(submitStory)
  const [url, setUrl] = React.useState('')
  const [title, setTitle] = React.useState('')
  const [comment, setComment] = React.useState('')
  const search = Route.useSearch()
  const { channels, byId } = useChannels()
  const [channel, setChannel] = React.useState(
    search.channel && byId.has(search.channel) ? search.channel : '',
  )
  const selected = channel ? byId.get(channel) : undefined
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<{ message: string; existingId?: string } | null>(null)
  const [touched, setTouched] = React.useState(false)

  const urlValid = isHttpUrl(url.trim())
  const domain = urlValid ? hostnameOf(url.trim()) : null
  const urlError = touched && url && !urlValid ? 'Enter a full link, starting with https://' : null
  const canSubmit = urlValid && title.trim().length > 0 && !pending

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (!canSubmit) return
    setPending(true)
    setError(null)
    try {
      const result = await submit({
        data: {
          url: url.trim(),
          title: title.trim(),
          comment: comment.trim() || undefined,
          channel: channel || undefined,
        },
      })
      if (!result.ok) {
        if (result.code === 'unauthorized') {
          await navigate({ to: '/signin', search: { redirect: '/submit' } })
          return
        }
        setError({ message: result.error, existingId: result.existingId })
        return
      }
      await queryClient.invalidateQueries({ queryKey: ['mine'] })
      toast.success('Story submitted', {
        description: 'It joins the feeds as soon as our curator has reviewed it.',
      })
      await navigate({ to: '/threads/$threadId', params: { threadId: result.data.id } })
    } catch {
      setError({ message: 'Something went wrong. Please try again.' })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl pb-6">
      <header className="mb-6 animate-rise-in px-1">
        <p className="mb-0.5 text-footnote font-semibold text-brand-text">Share with the community</p>
        <h1 className="text-title-1 text-label sm:text-large-title">Submit a story</h1>
        <p className="mt-1.5 text-subhead text-label-secondary">
          Found something worth reading? Post the link and start the conversation.
        </p>
      </header>

      <Card className="animate-rise-in p-5 [animation-delay:60ms] sm:p-6">
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <Field
            label="Link"
            htmlFor="url"
            error={urlError}
            hint={
              domain ? (
                <span className="inline-flex items-center gap-1.5 text-label-secondary">
                  <Favicon domain={domain} size={14} />
                  {domain}
                </span>
              ) : (
                'Paste the URL of the original article.'
              )
            }
          >
            <Input
              type="url"
              inputMode="url"
              autoComplete="url"
              autoFocus
              required
              placeholder="https://"
              maxLength={LIMITS.urlMax}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onBlur={() => setTouched(true)}
            />
          </Field>

          <Field
            label="Title"
            htmlFor="title"
            aside={
              <span
                className={cn(
                  'text-caption-1 text-label-tertiary tabular',
                  title.length > LIMITS.titleMax - 40 && 'text-warning',
                )}
              >
                {title.length}/{LIMITS.titleMax}
              </span>
            }
          >
            <Input
              required
              placeholder="What’s the story?"
              maxLength={LIMITS.titleMax}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>

          <Field
            label="Channel"
            htmlFor="channel"
            optional
            hint="Pick where it belongs. It always appears on the front page too."
          >
            <div className="relative">
              {selected && (
                <ChannelIcon
                  channel={selected}
                  size={22}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                />
              )}
              <select
                value={channel}
                onChange={(event) => setChannel(event.target.value)}
                className={cn(
                  'h-11 w-full appearance-none rounded-control border border-transparent bg-fill-secondary pr-10 text-callout text-label transition-[background-color,border-color,box-shadow] outline-none hover:bg-fill focus:border-brand/40 focus:bg-surface focus:shadow-[0_0_0_4px_var(--brand-tint)]',
                  selected ? 'pl-11' : 'pl-3.5',
                  !channel && 'text-label-tertiary',
                )}
              >
                <option value="">No channel</option>
                {groupByCategory(channels).map((group) => (
                  <optgroup key={group.category} label={group.category}>
                    {group.channels.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-label-tertiary" />
            </div>
          </Field>

          <Field label="Start the discussion" htmlFor="comment" optional hint="Posted as the first comment.">
            <Textarea
              rows={4}
              maxRows={12}
              placeholder="Why is this interesting?"
              maxLength={LIMITS.submissionNoteMax}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </Field>

          {error && (
            <Callout>
              {error.message}
              {error.existingId && (
                <Link
                  to="/threads/$threadId"
                  params={{ threadId: error.existingId }}
                  className="ml-1 inline-flex items-center gap-0.5 font-semibold underline-offset-2 hover:underline"
                >
                  Join that discussion
                  <ArrowRight className="size-3.5" />
                </Link>
              )}
            </Callout>
          )}

          <div className="flex flex-col-reverse items-stretch justify-between gap-3 pt-1 sm:flex-row sm:items-center">
            <p className="text-center text-caption-1 text-label-tertiary sm:text-left">
              Up to 5 stories every 16 hours.
            </p>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={pending}
              disabled={!canSubmit}
              className="sm:min-w-36"
            >
              Submit story
            </Button>
          </div>
        </form>
      </Card>

      <section aria-label="Submission tips" className="mt-4 grid gap-3 sm:grid-cols-3">
        {TIPS.map((tip, index) => (
          <Card
            key={tip.title}
            className="animate-rise-in p-4"
            style={{ animationDelay: `${120 + index * 50}ms` }}
          >
            <tip.icon className="size-5 text-brand-text" strokeWidth={2} aria-hidden />
            <p className="mt-2.5 text-subhead font-semibold text-label">{tip.title}</p>
            <p className="mt-0.5 text-footnote text-label-secondary">{tip.text}</p>
          </Card>
        ))}
      </section>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-caption-1 text-label-tertiary">
        <BadgeCheck className="size-3.5" aria-hidden />
        Ranking is open source:{' '}
        <a
          href="https://github.com/refetch-io/refetch/tree/main/functions/algorithm"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-text hover:underline"
        >
          read the algorithm
        </a>
      </p>
    </div>
  )
}
