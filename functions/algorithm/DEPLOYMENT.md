# Algorithm Function Deployment Guide

## Overview

This guide explains how to deploy and configure the Algorithm Function in Appwrite Cloud Functions.

## Prerequisites

- Appwrite Cloud account with Functions enabled
- Node.js 18+ installed locally (for testing)
- Access to your Appwrite project

## Environment Variables

The function requires the following environment variables to be set in your Appwrite project:

### Required Variables

```bash
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://your-region.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key

# Database Configuration
APPWRITE_DATABASE_ID=your-database-id
APPWRITE_POSTS_COLLECTION_ID=your-posts-collection-id
```

## Deployment Steps

### 1. Prepare the Function

1. Navigate to your Appwrite project dashboard
2. Go to **Functions** section
3. Click **Create Function**

### 2. Function Configuration

- **Name**: `algorithm`
- **Runtime**: `Node.js 18`
- **Entrypoint**: `index.js`
- **Timeout**: `300 seconds` (5 minutes)

### 3. Upload Function Files

Upload the following files to your function:

- `index.js` - Main function logic (contains everything)
- `package.json` - Dependencies
- `README.md` - Documentation

### 4. Install Dependencies

The function will automatically install dependencies from `package.json`:

```json
{
  "dependencies": {
    "node-appwrite": "^17.2.0"
  }
}
```

### 5. Set Environment Variables

In your function settings, add all the required environment variables listed above.

### 6. Deploy the Function

Click **Deploy** to make your function live.

## Configuration

### Scoring Weights

The algorithm uses configurable weights for different factors. You can modify these directly in `index.js`:

```javascript
const SCORING_WEIGHTS = {
  timeScore: 0.35,      // 35% - Time relevance
  spellingScore: 0.15,  // 15% - Writing quality
  spamScore: 0.25,      // 25% - Content legitimacy
  safetyScore: 0.10,    // 10% - Safety
  qualityScore: 0.15    // 15% - Quality
};
```

**Important**: The sum of all weights must equal 1.0 (100%).

### Processing Settings

Adjust batch processing behavior in the `PROCESSING_CONFIG` section:

```javascript
const PROCESSING_CONFIG = {
  batchSize: 1000,             // Posts per batch (optimal for Appwrite)
  maxProcessingTime: 300000,   // Max processing time (5 min)
  rateLimitDelay: 100,         // Delay between batches
  timeScoreDecayHours: 24      // Hours for time score decay
};
```

## Testing

### Function Testing

1. In your Appwrite dashboard, go to the function
2. Click **Test** tab
3. Send a test request (any JSON payload will work)
4. Check the logs for execution details

## Scheduling

### Recommended Schedule

Run the algorithm function every **1-2 hours** to keep post scores current:

- **Frequency**: Every 1-2 hours
- **Time**: During low-traffic periods
- **Duration**: Should complete within 5 minutes

### Cron Expression Examples

```bash
# Every hour
0 * * * *

# Every 2 hours
0 */2 * * *

# Every 4 hours
0 */4 * * *
```

## Monitoring

### Function Logs

Monitor the function logs for:

- Processing statistics
- Error rates
- Performance metrics
- Scoring summaries

### Key Metrics to Watch

- **Success Rate**: Should be >95%
- **Processing Time**: Should be <5 minutes
- **Error Count**: Should be minimal
- **Posts Processed**: Should match expected volume

### Alerts

Set up alerts for:

- Function failures
- High error rates
- Long processing times
- Low success rates

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   - Check all required variables are set
   - Verify API key permissions

2. **Database Permission Errors**
   - Ensure API key has read/write access to posts collection
   - Check collection ID is correct

3. **Rate Limiting**
   - Increase `rateLimitDelay` in config
   - Reduce `batchSize` if needed

4. **Memory Issues**
   - Reduce `batchSize`
   - Check function memory limits

5. **Timeout Errors**
   - Increase function timeout
   - Reduce `batchSize`
   - Optimize batch processing

### Performance Optimization

1. **Batch Size**
   - Optimized to 1000 posts per batch for Appwrite performance
   - Uses cursor pagination for efficient reading of large datasets

2. **Rate Limiting**
   - Balance speed vs. API limits
   - Monitor Appwrite rate limit responses

## Security Considerations

1. **API Key Permissions**
   - Use minimal required permissions
   - Rotate keys regularly

2. **Input Validation**
   - Function validates all inputs
   - Uses safe defaults for missing data

3. **Error Handling**
   - Errors don't expose sensitive information
   - Graceful degradation on failures

## Maintenance

### Regular Tasks

1. **Monitor Performance**
   - Check processing times
   - Review error rates
   - Analyze scoring patterns

2. **Update Configuration**
   - Adjust weights based on performance
   - Fine-tune time decay settings
   - Optimize batch processing

3. **Review Logs**
   - Check for anomalies
   - Monitor scoring trends
   - Identify potential issues

### Version Updates

1. **Backup Configuration**
   - Save current config before updates
   - Document any custom changes

2. **Test Changes**
   - Use test environment if available
   - Verify scoring logic works correctly

3. **Gradual Rollout**
   - Deploy during low-traffic periods
   - Monitor closely after deployment

## Support

For issues or questions:

1. Check function logs for error details
2. Review configuration settings in `index.js`
3. Consult Appwrite documentation
4. Check function timeout and memory limits

## Example Deployment

Here's a complete example of deploying the function:

```bash
# 1. Create function in Appwrite dashboard
# 2. Set runtime to Node.js 18
# 3. Set timeout to 300 seconds
# 4. Upload function files (index.js, package.json, README.md)
# 5. Set environment variables
# 6. Deploy function
# 7. Test with sample request
# 8. Schedule to run every 2 hours
# 9. Monitor logs and performance
# 10. Adjust configuration in index.js as needed
```

The algorithm function is now ready to process your posts and calculate ranking scores efficiently!
