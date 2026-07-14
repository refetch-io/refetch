import { Link, createFileRoute } from '@tanstack/react-router'
import {
  DocsArticle,
  DocsCode,
  DocsInlineCode,
  DocsSection,
} from '@/components/docs/docs-article'

export const Route = createFileRoute('/_app/docs/')({
  component: DocsOverviewPage,
  head: () => ({
    meta: [{ title: 'Docs - Refetch' }],
  }),
})

function DocsOverviewPage() {
  return (
    <DocsArticle
      title="Overview"
      description="Build clients against Refetch's public REST API - list posts, submit links, thread comments, and vote."
    >
      <DocsSection title="Base URL">
        <p>
          All HTTP endpoints are served from your Refetch origin under{' '}
          <DocsInlineCode>/api/v1</DocsInlineCode>. Example relative path:{' '}
          <DocsInlineCode>GET /api/v1/posts</DocsInlineCode>.
        </p>
        <DocsCode>{`curl https://your-host/api/v1/posts?sort=top&limit=20`}</DocsCode>
      </DocsSection>

      <DocsSection title="What you can do">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Posts</strong> - list, search, create, and delete stories
            (link or text).
          </li>
          <li>
            <strong>Comments</strong> - nested threads on a post; authors can
            delete their own comments.
          </li>
          <li>
            <strong>Votes</strong> - upvote / downvote with optimistic toggles,
            plus batch vote state for feeds.
          </li>
          <li>
            <strong>Account</strong> - read the current user and update profile
            fields when authenticated.
          </li>
        </ul>
      </DocsSection>

      <DocsSection title="Machine-readable spec">
        <p>
          The API is described by an OpenAPI 3.1 document. Download it at{' '}
          <a
            href="/openapi.json"
            className="font-medium text-foreground underline underline-offset-4"
          >
            /openapi.json
          </a>
          , or browse methods visually in the{' '}
          <Link
            to="/docs/api"
            className="font-medium text-foreground underline underline-offset-4"
          >
            API reference
          </Link>
          .
        </p>
      </DocsSection>

      <DocsSection title="Next steps">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <Link
              to="/docs/authentication"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Authentication
            </Link>{' '}
            - personal API keys for protected routes.
          </li>
          <li>
            <Link
              to="/docs/errors"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Errors
            </Link>{' '}
            - status codes and the JSON error envelope.
          </li>
          <li>
            <Link
              to="/docs/api"
              className="font-medium text-foreground underline underline-offset-4"
            >
              API reference
            </Link>{' '}
            - parameters, request bodies, and response models per method.
          </li>
        </ul>
      </DocsSection>
    </DocsArticle>
  )
}
