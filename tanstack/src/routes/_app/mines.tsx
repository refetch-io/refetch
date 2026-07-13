import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { FeedPage } from '@/components/feed-page'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api/client'
import type { Post } from '@/lib/types'
import { Spinner } from '@/components/ui/spinner'

export const Route = createFileRoute('/_app/mines')({
  component: MinesPage,
  head: () => ({
    meta: [{ title: 'Refetch — Mines' }],
  }),
})

function MinesPage() {
  const { user, loading, isAuthenticated } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (loading) return
    if (!isAuthenticated || !user) {
      window.location.href = '/signin'
      return
    }
    ;(async () => {
      try {
        const result = await api.listPosts({
          sort: 'mines',
          userId: user.$id,
          limit: 25,
          offset: 0,
        })
        setPosts(result.data)
        setTotal(result.total)
      } finally {
        setFetching(false)
      }
    })()
  }, [loading, isAuthenticated, user])

  if (loading || fetching) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  return (
    <FeedPage
      initialPosts={posts}
      initialTotal={total}
      sort="mines"
      title="Mines"
      description="Stories you have submitted."
      userId={user?.$id}
    />
  )
}
