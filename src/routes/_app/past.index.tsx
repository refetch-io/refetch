import { createFileRoute, redirect } from '@tanstack/react-router'
import { yesterday } from '@/lib/past'

/** `/past` opens yesterday's front page (UTC). */
export const Route = createFileRoute('/_app/past/')({
  beforeLoad: () => {
    throw redirect({ to: '/past/$day', params: { day: yesterday() } })
  },
})
