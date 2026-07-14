import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { SubmitWizard } from '@/components/submit/submit-wizard'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api/client'
import { clearPresenceActivity, reportPresenceActivity } from '@/lib/presence'

export const Route = createFileRoute('/_app/submit')({
  component: SubmitPage,
  head: () => ({
    meta: [{ title: 'Submit - Refetch' }],
  }),
})

function SubmitPage() {
  const { isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate({ to: '/signin' })
  }, [loading, isAuthenticated, navigate])

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner />
      </div>
    )
  }

  return (
    <SubmitWizard
      onSubmit={async ({ title, url, description }) => {
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
        } finally {
          clearPresenceActivity()
        }
      }}
    />
  )
}
