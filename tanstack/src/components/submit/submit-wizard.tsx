import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  Globe2,
  Link2,
  MessageSquareText,
  Type,
  X,
} from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Favicon } from '@/components/favicon'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

function SummaryRow({
  icon,
  label,
  value,
  placeholder = false,
}: {
  icon: ReactNode
  label: string
  value: string
  placeholder?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p
          className={cn(
            'mt-0.5 truncate text-sm font-medium',
            placeholder && 'font-normal text-muted-foreground',
          )}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

type SubmitWizardProps = {
  onSubmit: (values: {
    title: string
    url: string
    description: string
  }) => Promise<void>
}

function hostnameFromUrl(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function SubmitWizard({ onSubmit }: SubmitWizardProps) {
  const formId = useId()
  const titleId = useId()
  const urlId = useId()
  const commentId = useId()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const trimmedTitle = title.trim()
  const trimmedUrl = url.trim()
  const trimmedDescription = description.trim()
  const host = hostnameFromUrl(trimmedUrl)
  const urlReady = isValidHttpUrl(trimmedUrl)
  const canSubmit = trimmedTitle.length > 0 && urlReady && !submitting

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      await onSubmit({
        title: trimmedTitle,
        url: trimmedUrl,
        description: trimmedDescription,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" asChild aria-label="Back">
            <Link to="/">
              <ArrowLeft />
            </Link>
          </Button>
          <h1 className="truncate font-sans text-base font-semibold tracking-tight">
            Submit a link
          </h1>
        </div>
        <Button variant="ghost" size="icon" asChild aria-label="Close">
          <Link to="/">
            <X />
          </Link>
        </Button>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:gap-8 lg:py-8">
        <main className="min-w-0 flex-1 pb-24 lg:pb-8">
          <form
            id={formId}
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle className="font-sans">Details</CardTitle>
                <CardDescription>
                  Share an article, project, or anything worth a look.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={titleId}>Title</FieldLabel>
                    <Input
                      id={titleId}
                      required
                      autoFocus
                      maxLength={200}
                      placeholder="A clear, specific title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={urlId}>URL</FieldLabel>
                    <Input
                      id={urlId}
                      type="url"
                      required
                      inputMode="url"
                      placeholder="https://"
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                    />
                    <FieldDescription>
                      {host
                        ? `Linking to ${host}`
                        : 'Must start with http:// or https://'}
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-sans">Comment</CardTitle>
                <CardDescription>
                  Optional. Posted as the first comment on your story.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Field>
                  <FieldLabel htmlFor={commentId}>Your note</FieldLabel>
                  <Textarea
                    id={commentId}
                    rows={5}
                    placeholder="Why should people click this?"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="min-h-28"
                  />
                </Field>
              </CardContent>
            </Card>
          </form>
        </main>

        <aside className="w-full shrink-0 lg:sticky lg:top-20 lg:w-80 xl:w-96">
          <Card>
            <CardHeader>
              <CardTitle className="font-sans">Summary</CardTitle>
              <CardDescription>
                Review your story before submitting.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3 ring-1 ring-foreground/10">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-background ring-1 ring-foreground/10">
                  {host ? (
                    <Favicon domain={host} size={22} className="ring-0" />
                  ) : (
                    <Link2 className="size-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center gap-2">
                    <Badge variant="secondary">Link</Badge>
                  </div>
                  <p
                    className={cn(
                      'line-clamp-2 text-sm font-medium leading-snug',
                      !trimmedTitle && 'font-normal text-muted-foreground',
                    )}
                  >
                    {trimmedTitle || 'Your title will appear here'}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {host || 'Source domain after you add a URL'}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-4">
                <SummaryRow
                  icon={<Type className="size-4" />}
                  label="Title"
                  value={trimmedTitle || 'Not set'}
                  placeholder={!trimmedTitle}
                />
                <SummaryRow
                  icon={<Globe2 className="size-4" />}
                  label="Source"
                  value={host || 'Not set'}
                  placeholder={!host}
                />
                <SummaryRow
                  icon={<MessageSquareText className="size-4" />}
                  label="Comment"
                  value={
                    trimmedDescription
                      ? trimmedDescription.length > 72
                        ? `${trimmedDescription.slice(0, 72)}…`
                        : trimmedDescription
                      : 'No comment'
                  }
                  placeholder={!trimmedDescription}
                />
              </div>
            </CardContent>
            <CardFooter className="justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                {canSubmit || submitting ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                ) : (
                  <CircleDashed className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    'truncate',
                    canSubmit || submitting
                      ? 'text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {canSubmit || submitting
                    ? 'Ready to submit'
                    : 'Complete required fields'}
                </span>
              </div>
            </CardFooter>
          </Card>
        </aside>
      </div>

      <footer className="sticky bottom-0 z-20 border-t border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-end gap-2 px-4 py-3 sm:px-6">
          <Button variant="ghost" asChild>
            <Link to="/">Cancel</Link>
          </Button>
          <Button type="submit" form={formId} size="lg" disabled={!canSubmit}>
            {submitting ? <Spinner data-icon="inline-start" /> : null}
            Submit story
          </Button>
        </div>
      </footer>
    </div>
  )
}
