# Refetch (TanStack Start)

Open-source Hacker News alternative rebuilt with TanStack Start, shadcn/ui, and Appwrite.

## Stack

- **TanStack Start** — SSR pages + server routes
- **Appwrite Web SDK** — client-side auth (sessions)
- **Appwrite Node SDK** — server-side data + JWT verification
- **shadcn/ui** — UI primitives

## Auth model

1. Browser signs in via Appwrite Web SDK (`createEmailPasswordSession`)
2. Client creates a short-lived JWT (`account.createJWT`) and caches it
3. Mutations call `/api/v1/*` with `Authorization: Bearer <jwt>`
4. Server verifies JWT with Node SDK, then uses the API key for TablesDB

## REST API (`/api/v1`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/posts` | no | List posts (`sort`, `limit`, `offset`, `userId`) |
| POST | `/posts` | JWT | Create post |
| GET | `/posts/:postId` | no | Get post |
| DELETE | `/posts/:postId` | JWT | Delete own post |
| GET | `/posts/:postId/comments` | no | List nested comments |
| POST | `/posts/:postId/comments` | JWT | Create comment |
| DELETE | `/comments/:commentId` | JWT | Delete own comment |
| GET | `/votes?resourceId&resourceType` | JWT | Vote state |
| POST | `/votes` | JWT | Cast/toggle vote or `{ action: "batch", resources }` |
| GET | `/account` | JWT | Current user |
| PATCH | `/account` | JWT | Update name / email / password |

## Setup

```bash
cd tanstack
cp .env.example .env
# fill APPWRITE_API_KEY and confirm project / table IDs
npm install
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

## Pages

- `/` Top feed (SSR)
- `/new`, `/show`, `/mines`
- `/submit`
- `/signin`, `/signup`
- `/account`
- `/threads/:threadId`
