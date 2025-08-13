# Scout Function Batching Configuration

The scout function now uses intelligent batching to avoid exceeding LLM token limits. Here are the configurable environment variables:

## Environment Variables

### `LLM_MAX_TOKENS`
- **Default**: `6000`
- **Description**: Maximum tokens to use for each batch (conservative limit to stay well under the 8192 token limit)
- **Usage**: Set this lower if you're still hitting token limits, or higher if you want larger batches

### `LLM_MAX_BATCH_SIZE`
- **Default**: `20`
- **Description**: Maximum number of URLs to process in a single batch
- **Usage**: Increase this if you want larger batches (but be careful not to exceed token limits)

### `LLM_MIN_BATCH_SIZE`
- **Default**: `5`
- **Description**: Minimum number of URLs to process in a single batch
- **Usage**: Decrease this if you want smaller batches for better reliability

### `DEBUG_BATCHING`
- **Default**: `false`
- **Description**: Enable debug logging for batch size calculations
- **Usage**: Set to `true` to see detailed batch size calculations

## How Batching Works

1. **Token Estimation**: Each URL + label is estimated to use ~75 tokens
2. **Batch Calculation**: Optimal batch size is calculated based on available tokens
3. **Processing**: URLs are split into batches and processed sequentially
4. **Retry Logic**: Failed batches are retried up to 2 times with exponential backoff
5. **Rate Limiting**: Delays are added between batches to avoid API rate limits

## Example Configuration

```bash
# Conservative settings (smaller batches, more reliable)
LLM_MAX_TOKENS=5000
LLM_MAX_BATCH_SIZE=15
LLM_MIN_BATCH_SIZE=3

# Aggressive settings (larger batches, faster processing)
LLM_MAX_TOKENS=7000
LLM_MAX_BATCH_SIZE=25
LLM_MIN_BATCH_SIZE=8

# Debug mode
DEBUG_BATCHING=true
```

## Benefits

- ✅ **No More Token Limit Errors**: URLs are processed in small batches that fit within limits
- ✅ **Better Reliability**: Failed batches can be retried automatically
- ✅ **Configurable**: Adjust batch sizes based on your needs and API limits
- ✅ **Progress Tracking**: Clear visibility into batch processing progress
- ✅ **Rate Limiting**: Built-in delays to avoid overwhelming the API

## Monitoring

The function now provides detailed logging for the batching process:

```
📦 Processing 46 URLs in 4 batches of ~12
🔄 Processing batch 1/4 (12 URLs, ~1200 tokens)
✅ Batch 1: 8/10 articles valid
🔄 Processing batch 2/4 (12 URLs, ~1200 tokens)
✅ Batch 2: 6/9 articles valid
...
📊 Batching Summary: Processed 46 URLs in approximately 4 batches to avoid token limits
```
