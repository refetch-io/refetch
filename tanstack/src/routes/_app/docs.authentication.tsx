import { Link, createFileRoute } from '@tanstack/react-router'
import {
  DocsArticle,
  DocsCode,
  DocsInlineCode,
  DocsSection,
} from '@/components/docs/docs-article'

export const Route = createFileRoute('/_app/docs/authentication')({
  component: DocsAuthenticationPage,
  head: () => ({
    meta: [{ title: 'Authentication - Refetch Docs' }],
  }),
})

function DocsAuthenticationPage() {
  return (
    <DocsArticle
      title="Authentication"
      description="Call protected Refetch API routes with a personal API key created in your Account settings."
    >
      <DocsSection title="Personal API keys">
        <p>
          Create a key under{' '}
          <Link
            to="/account/keys"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Account
          </Link>
          . The full secret is shown once and stored encrypted at rest. Keys look
          like <DocsInlineCode>rfk_…</DocsInlineCode>.
        </p>
      </DocsSection>

      <DocsSection title="Request header">
        <DocsCode>{`Authorization: Bearer rfk_a1b2c3d4_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`}</DocsCode>
        <p>
          Missing or invalid keys return <DocsInlineCode>401</DocsInlineCode>{' '}
          with a JSON <DocsInlineCode>error</DocsInlineCode> message. See{' '}
          <Link
            to="/docs/errors"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Errors
          </Link>
          .
        </p>
      </DocsSection>

      <DocsSection title="Example">
        <DocsCode>{`await fetch('/api/v1/posts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer rfk_a1b2c3d4_xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  },
  body: JSON.stringify({
    title: 'Hello Refetch',
    url: 'https://example.com',
    type: 'link',
  }),
})`}</DocsCode>
      </DocsSection>

      <DocsSection title="Managing keys">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Create, list, and revoke keys from the Account page (or{' '}
            <DocsInlineCode>/api/v1/keys</DocsInlineCode> while signed in).
          </li>
          <li>At most 10 keys per account.</li>
          <li>
            Revoking a key immediately stops it from authenticating API
            requests.
          </li>
        </ul>
      </DocsSection>

      <DocsSection title="Which routes need auth">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Public</strong> - listing and reading posts, listing
            comments, search.
          </li>
          <li>
            <strong>API key required</strong> - create/delete posts,
            create/delete comments, cast votes, read account.
          </li>
        </ul>
        <p>
          Each method in the{' '}
          <Link
            to="/docs/api"
            className="font-medium text-foreground underline underline-offset-4"
          >
            API reference
          </Link>{' '}
          shows whether authentication is required.
        </p>
      </DocsSection>

      <DocsSection title="Ownership">
        <p>
          Authenticated deletes are scoped to the key owner. Attempting to
          delete another user&apos;s post or comment returns{' '}
          <DocsInlineCode>403</DocsInlineCode>.
        </p>
      </DocsSection>
    </DocsArticle>
  )
}
