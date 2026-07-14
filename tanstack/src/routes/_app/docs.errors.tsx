import { Link, createFileRoute } from '@tanstack/react-router'
import {
  DocsArticle,
  DocsCode,
  DocsInlineCode,
  DocsSection,
} from '@/components/docs/docs-article'

export const Route = createFileRoute('/_app/docs/errors')({
  component: DocsErrorsPage,
  head: () => ({
    meta: [{ title: 'Errors - Refetch Docs' }],
  }),
})

function DocsErrorsPage() {
  return (
    <DocsArticle
      title="Errors"
      description="Failed requests return JSON with a human-readable error string and an HTTP status that matches the failure mode."
    >
      <DocsSection title="Error envelope">
        <p>
          Error bodies always include at least an{' '}
          <DocsInlineCode>error</DocsInlineCode> field:
        </p>
        <DocsCode>{`{
  "error": "Invalid or expired token"
}`}</DocsCode>
        <p>
          Some responses may include additional fields for context; treat{' '}
          <DocsInlineCode>error</DocsInlineCode> as the message to surface to
          developers or logs.
        </p>
      </DocsSection>

      <DocsSection title="Status codes">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <DocsInlineCode>400</DocsInlineCode> - Bad request (validation,
            missing fields, unsupported query values).
          </li>
          <li>
            <DocsInlineCode>401</DocsInlineCode> - Missing or invalid{' '}
            <DocsInlineCode>Authorization</DocsInlineCode> Bearer API key.
          </li>
          <li>
            <DocsInlineCode>403</DocsInlineCode> - Authenticated, but not allowed
            (e.g. deleting someone else's resource).
          </li>
          <li>
            <DocsInlineCode>404</DocsInlineCode> - Resource not found.
          </li>
          <li>
            <DocsInlineCode>500</DocsInlineCode> - Unexpected server error.
          </li>
        </ul>
      </DocsSection>

      <DocsSection title="Client checklist">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            On <DocsInlineCode>401</DocsInlineCode>, confirm the API key is
            correct and has not been revoked, then retry.
          </li>
          <li>
            Prefer reading <DocsInlineCode>body.error</DocsInlineCode> over the
            raw status text when present.
          </li>
          <li>
            Treat network failures separately from JSON API errors.
          </li>
        </ul>
      </DocsSection>

      <DocsSection title="Related">
        <p>
          Learn how to create API keys in{' '}
          <Link
            to="/docs/authentication"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Authentication
          </Link>
          , then exercise endpoints in the{' '}
          <Link
            to="/docs/api"
            className="font-medium text-foreground underline underline-offset-4"
          >
            API reference
          </Link>
          .
        </p>
      </DocsSection>
    </DocsArticle>
  )
}
