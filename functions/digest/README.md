# digest

Scheduled Appwrite function that gets the daily and weekly email digests out.

It holds no logic of its own: every hour it calls the site's `POST /api/digest` with a shared secret, and the site does the work in [`src/server/digest.server.ts`](../../src/server/digest.server.ts):

1. Finds profiles whose `digestNextAt` has passed (`digest` is `daily` or `weekly`; accounts that never chose get **weekly**, or nothing if they turned activity emails off).
2. Builds each reader's digest: **For you** (their channels and the people they follow) and **Top stories** (the front page of the last day, or the most upvoted of the last week), minus anything they muted.
3. Sends it with Appwrite Messaging (the project's email provider), with one-click **Unsubscribe**, **Switch to weekly/daily** and **Email settings** links in the footer.
4. Moves `digestNextAt` to the reader's next 8 AM (every day, or Mondays), in the time zone their browser reported at sign-in or the one picked in Settings.

Accounts seen for the first time are only scheduled, never sent to on the spot, so turning digests on doesn't email everyone at once. A digest more than 12 hours late (2 days for weekly) is skipped rather than sent stale. When the site runs out of time with readers still due it answers `more: true`, and the function calls again (up to 20 times a run).

## Schedule

Created by `npm run appwrite:setup`:

```cron
0 * * * *
```

Runs at the top of every hour (UTC).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SITE_URL` (or `NEXT_PUBLIC_BASE_URL`, `APP_BASE_URL`) | Yes | The site's public URL, e.g. `https://refetch.io` |
| `DIGEST_SECRET` | Yes | Shared secret; set the same value on the site (Appwrite Sites variables). Without it on the site, `/api/digest` answers 404 and nothing is sent |

Signed-in readers can preview their own digest from **Settings → Email → Preview** (`/api/digest/preview`).
