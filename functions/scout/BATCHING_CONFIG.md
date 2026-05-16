# Scout Function Batching Configuration

The scout function uses intelligent batching to avoid exceeding LLM token limits. Batch sizes and related tuning are **constants** at the top of `index.js` (not environment variables).

## Constants (in `index.js`)

### `LLM_MAX_TOKENS`

- **Default**: `6000`
- **Description**: Maximum tokens to use for each batch (conservative limit to stay well under the 8192 token limit)
- **Usage**: Lower if you still hit token limits; higher allows larger batches (within `LLM_MAX_BATCH_SIZE`)

### `LLM_MAX_BATCH_SIZE`

- **Default**: `20`
- **Description**: Maximum number of URLs to process in a single batch
- **Usage**: Increase for larger batches (watch token limits)

### `LLM_MIN_BATCH_SIZE`

- **Default**: `5`
- **Description**: Minimum number of URLs to process in a single batch
- **Usage**: Decrease for smaller batches when you want more reliability

### `DEBUG_BATCHING`

- **Default**: `false`
- **Description**: Log batch size calculation details
- **Usage**: Set to `true` while debugging batching

## How Batching Works

1. **Token Estimation**: Each URL + label is estimated to use ~75 tokens
2. **Batch Calculation**: Optimal batch size is calculated based on available tokens
3. **Processing**: URLs are split into batches and processed sequentially
4. **Retry Logic**: Failed batches are retried up to 2 times with exponential backoff
5. **Rate Limiting**: Delays are added between batches to avoid API rate limits

## Example tweaks (edit `index.js`)

```javascript
// Conservative settings (smaller batches, more reliable)
const LLM_MAX_TOKENS = 5000;
const LLM_MAX_BATCH_SIZE = 15;
const LLM_MIN_BATCH_SIZE = 3;

// Aggressive settings (larger batches, faster processing)
const LLM_MAX_TOKENS = 7000;
const LLM_MAX_BATCH_SIZE = 25;
const LLM_MIN_BATCH_SIZE = 8;

const DEBUG_BATCHING = true;
```

## Benefits

- **No More Token Limit Errors**: URLs are processed in small batches that fit within limits
- **Better Reliability**: Failed batches can be retried automatically
- **Configurable**: Adjust constants based on your needs and API limits
- **Progress Tracking**: Clear visibility into batch processing progress
- **Rate Limiting**: Built-in delays to avoid overwhelming the API

## Monitoring

The function provides detailed logging for the batching process:

```
📦 Processing 46 URLs in 4 batches of ~12
🔄 Processing batch 1/4 (12 URLs, ~1200 tokens)
✅ Batch 1: 8/10 articles valid
🔄 Processing batch 2/4 (12 URLs, ~1200 tokens)
✅ Batch 2: 6/9 articles valid
...
📊 Batching Summary: Processed 46 URLs in approximately 4 batches to avoid token limits
```
