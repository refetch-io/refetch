# topic-stats

Scheduled Appwrite function that:

1. Loads the **top 1000** posts in the **rolling 24-hour** window with the same quality filters as the main feed (`enhanced`, `spamScore` &lt; 70, `relevancyScore` &gt; 30), ordered by `score`.
2. Aggregates each post’s `topics` array (enhancement labels): **total score** = sum of `score` per topic, **article count** = number of posts that include that topic (each post counts at most once per topic).
3. Writes **`daily_topics`**: replaces all documents for the current **UTC calendar date** with ranked rows (`rank` 1 = highest `totalScore`).
4. Recomputes **`topics`** (all-time): paginates through all `enhanced` posts, aggregates the same way, then upserts one document per `topicKey`.

## Schedule

In Appwrite → Function → Triggers → **Schedule**:

```cron
0 */2 * * *
```

Runs at minute 0 every **2 hours** (UTC).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `APPWRITE_ENDPOINT` or `NEXT_PUBLIC_APPWRITE_ENDPOINT` | Yes | Appwrite API endpoint |
| `APPWRITE_PROJECT_ID` or `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | Yes | Project ID |
| `APPWRITE_API_KEY` | Yes | API key with database access |
| `APPWRITE_DATABASE_ID` | Yes | Database ID |
| `APPWRITE_POSTS_COLLECTION_ID` | Yes | Posts collection |
| `APPWRITE_DAILY_TOPICS_COLLECTION_ID` | Yes | Daily snapshot collection |
| `APPWRITE_TOPICS_COLLECTION_ID` | Yes | All-time topic stats collection |

## Appwrite collections

Create both collections in the same database as posts.

### `daily_topics`

| Attribute | Type | Notes |
|-----------|------|--------|
| `date` | string | `YYYY-MM-DD` (UTC) |
| `topicKey` | string | Normalized key (lowercase slug) |
| `topicLabel` | string | Display label (first seen casing) |
| `totalScore` | double | Sum of post `score` |
| `articleCount` | integer | Distinct posts in the top-1000 set |
| `rank` | integer | 1-based rank for that day |
| `computedAt` | datetime | ISO time of this run |

Indexes: `date` (for listing/deleting the day’s rows), optional `date` + `rank` for reads.

Document IDs are deterministic hashes (≤36 chars) derived from `date` + `topicKey`.

### `topics` (all-time)

| Attribute | Type | Notes |
|-----------|------|--------|
| `topicKey` | string | Same normalization as daily |
| `topicLabel` | string | Display label |
| `totalScore` | double | Sum of `score` over all enhanced posts with that topic |
| `articleCount` | integer | Post occurrences (deduped per post per topic) |
| `lastComputedAt` | datetime | Last full scan |

Index: `topicKey` (unique recommended). Document ID is a stable hash of `topicKey`.

## Scopes

Enable at least: `databases.read`, `databases.write` (and any scopes required for your API key to read/write these collections).

## Limits

- Full post scan stops after **200,000** documents (`MAX_FULL_SCAN_DOCS` in code); raise if needed.
- Batch size for the all-time scan: **500** posts per request.

## Deploy

- Runtime: **Node.js 18+**
- Entrypoint: `index.js`
- Build: `npm install`

## Response shape

Success:

```json
{
  "status": "success",
  "utcDate": "2026-05-12",
  "dailyTopicsWritten": 42,
  "allTimeTopicsUpserted": 120,
  "topPostsSampled": 1000,
  "elapsed": "3.2s",
  "trigger": "schedule"
}
```
