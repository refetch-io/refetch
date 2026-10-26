import { createFileRoute, redirect } from '@tanstack/react-router'

/** Shortcut to your own profile (the Profile nav item). */
export const Route = createFileRoute('/_app/me')({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: '/signin', search: { redirect: '/me' } })
    throw redirect({ to: '/u/$userId', params: { userId: context.user.id } })
  },
})
