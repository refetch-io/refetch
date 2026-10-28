import { createFileRoute, redirect } from '@tanstack/react-router'
import { movedPath } from '@/lib/redirect'

/** Profiles moved from `/u/:id` to `/users/:id` (tabs included); old links keep working. */
export const Route = createFileRoute('/u/$')({
  beforeLoad: ({ location }) => {
    throw redirect({ href: movedPath(location.href, '/u', '/users'), statusCode: 301 })
  },
})
