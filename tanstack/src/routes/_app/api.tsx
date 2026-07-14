import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/api')({
  beforeLoad: ({ location }) => {
    throw redirect({
      to: '/docs/api',
      hash: location.hash,
    })
  },
  component: () => null,
})
