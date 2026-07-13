import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
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
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api/client'
import { reportPresenceActivity, clearPresenceActivity } from '@/lib/presence'

export const Route = createFileRoute('/_app/submit')({
  component: SubmitPage,
  head: () => ({
    meta: [{ title: 'Submit — Refetch' }],
  }),
})

function SubmitPage() {
  const { isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate({ to: '/signin' })
  }, [loading, isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    reportPresenceActivity('Submitting a story')
    try {
      const post = await api.createPost({
        title,
        url,
        description: description || undefined,
        type: 'link',
      })
      navigate({
        to: '/threads/$threadId',
        params: { threadId: post.id },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
      clearPresenceActivity()
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 sm:px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Submit a link</CardTitle>
          <CardDescription>
            Share something worth reading with the community.
          </CardDescription>
        </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input
                id="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="url">URL</FieldLabel>
              <Input
                id="url"
                type="url"
                required
                placeholder="https://"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="description">Comment (optional)</FieldLabel>
              <Textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <FieldDescription>
                Posted as the first comment on your story.
              </FieldDescription>
            </Field>
            <Button type="submit" disabled={submitting}>
              Submit
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
      </Card>
    </div>
  )
}
