import { createFileRoute } from '@tanstack/react-router'
import { ApiKeysSection } from '@/components/account/api-keys-card'

export const Route = createFileRoute('/_app/account/keys')({
  component: AccountKeysPage,
  head: () => ({
    meta: [{ title: 'API keys - Account - Refetch' }],
  }),
})

function AccountKeysPage() {
  return <ApiKeysSection />
}
