import { createFileRoute } from '@tanstack/react-router'
import { ApiDocsPage } from '@/components/api-docs/api-docs-page'

export const Route = createFileRoute('/_app/docs/api')({
  component: ApiDocsPage,
  head: () => ({
    meta: [{ title: 'API reference - Refetch Docs' }],
  }),
})
