import { createFileRoute, redirect } from '@tanstack/react-router'
import { movedPath } from '@/lib/redirect'

/** Channels moved from `/c/:id` to `/channels/:id`; old links keep working. */
export const Route = createFileRoute('/c/$')({
  beforeLoad: ({ location }) => {
    throw redirect({ href: movedPath(location.href, '/c', '/channels'), statusCode: 301 })
  },
})
