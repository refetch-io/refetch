# App API (`/api/app/*`)

The JSON API the Refetch mobile and desktop apps
([refetch_flutter](https://github.com/refetch-io/refetch_flutter)) call for
everything that writes or needs the signed-in person's private data.

The apps **read public data straight from Appwrite** (posts, comments, channels
and topics are readable by anyone). Writes can't go there directly: a vote also
moves the story's score counters, and comments and submissions run rate limits,
duplicate checks, mentions and notifications. Those rules live in
`src/server/*.server.ts`, so these routes call the same functions the website's
server functions call — nothing is duplicated.

## Auth

Every route needs `Authorization: Bearer <Appwrite JWT>`. The app mints the JWT
with `account.createJWT()`; the route verifies it with Appwrite (`account.get`
as that user), the same check `establishSession` does for the website. A missing,
expired or forged token gets `401 { "error": "Please sign in to continue.", "code": "unauthorized" }`.

## Responses

- Success: `200 { "data": … }`
- Failure: `{ "error": "<message for people>", "code"?, "existingId"? }` with
  `400` (validation or a rule), `401` (`unauthorized`), `409` (`duplicate`) or
  `429` (`rate_limited`); `500` for an unexpected error.

## Routes

| Method | Path | Body | `data` |
| --- | --- | --- | --- |
| POST | `/api/app/session` | `{}` | `{ user }`. Call after signing in; creates or renames the profile. |
| POST | `/api/app/vote` | `{ resourceType: 'post' \| 'comment', resourceId, direction: 'up' \| 'down' }` | `{ vote: 'up' \| 'down' \| null, count }`. Same direction again removes the vote. |
| POST | `/api/app/votes` | `{ posts?: string[], comments?: string[] }` (≤ 200 each) | `{ posts: { [id]: 'up' \| 'down' }, comments: { … } }` |
| POST | `/api/app/comments` | `{ postId, content, replyId? }` | the new comment |
| DELETE | `/api/app/comments/:id` | — | — (your own comments only) |
| POST | `/api/app/submit` | `{ title, url, comment? }` | `{ id }`; `409` with `existingId` when the link was already shared |

Validation lives in `src/lib/app-api.ts` (unit tested); the request handling in
`src/server/app-api.server.ts`.
