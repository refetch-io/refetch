# channels

Scheduled Appwrite function that keeps every channel stocked with fresh stories.

1. Loads the channel catalog from the **`channels`** table (seeded from [`scripts/channels.json`](../../scripts/channels.json) by `npm run appwrite:setup`).
2. For each channel, fetches its **official** RSS/Atom feeds (`sources`: blogs, release notes, GitHub releases). Only when those have nothing new does it try the **community** feeds (`communitySources`, mostly DEV tags).
3. Keeps items published in the last **72 hours** whose link isn't on Refetch yet, and posts the newest one as **Scout** (`userId` `0`), with `channel` set to the channel ID.
4. New posts go through the regular pipeline (Enhancement → Algorithm) like any other story.

Limits are constants at the top of `index.js`: **1** story per channel per run, **25** per run overall. Channels are visited in a random order each run so none starve once there are more channels than that. GitHub release feeds keep version tags only and name the project (`1.7.4` becomes `Appwrite 1.7.4 released`), skipping package tags and other noise.

## Schedule

Created by `npm run appwrite:setup`:

```cron
15 */2 * * *
```

Runs at minute 15 every **2 hours** (UTC), between Scout runs.

## Environment variables

Usually inherited from the project's global variables.

| Variable | Required | Description |
|----------|----------|-------------|
| `APPWRITE_ENDPOINT` or `NEXT_PUBLIC_APPWRITE_ENDPOINT` | Yes | Appwrite API endpoint |
| `APPWRITE_PROJECT_ID` or `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | Yes | Project ID |
| `APPWRITE_API_KEY` | No | API key; falls back to the function's dynamic key (scopes `tables.read`, `rows.read`, `rows.write`) |
| `APPWRITE_DATABASE_ID` | Yes | Database ID |
| `APPWRITE_POSTS_COLLECTION_ID` | Yes | Posts table |
| `APPWRITE_CHANNELS_COLLECTION_ID` | No | Channels table (default `channels`) |

## Adding a channel

Add an entry to `scripts/channels.json` (`id`, `name`, `glyph`, `color`, `description`, `keywords`, `sources`, `communitySources`) and run `npm run appwrite:setup`. `keywords` should match the topic labels Enhancement assigns, so stories found elsewhere land in the channel too.
