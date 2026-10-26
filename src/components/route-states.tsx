import { Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { Compass, RotateCw, TriangleAlert } from 'lucide-react'
import { Button } from './ui/button'
import { EmptyState } from './ui/misc'

export function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="rounded-card bg-surface shadow-card">
        <EmptyState
          icon={<Compass />}
          title="Page not found"
          description="The page you’re looking for doesn’t exist, or the story was removed."
          action={
            <Button asChild variant="primary" size="md">
              <Link to="/">Back to Top Stories</Link>
            </Button>
          }
        />
      </div>
    </div>
  )
}

export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  if (import.meta.env.DEV) console.error(error)
  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="rounded-card bg-surface shadow-card">
        <EmptyState
          icon={<TriangleAlert />}
          title="Something went wrong"
          description="We couldn’t load this page. Check your connection and try again."
          action={
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                reset()
                void router.invalidate()
              }}
            >
              <RotateCw />
              Try again
            </Button>
          }
        />
      </div>
    </div>
  )
}
