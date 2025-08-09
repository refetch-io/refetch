# Plausible Analytics API Integration

This document describes the fixed Plausible Analytics API integration for the Refetch application.

## Overview

The Plausible Analytics integration has been completely rewritten to properly implement the [Plausible Stats API v2](https://plausible.io/docs/stats-api) according to the official documentation.

## What Was Fixed

### 1. **Realtime Stats API**
- **Before**: Used incorrect query structure with `"day"` date range
- **After**: Uses proper custom date range for current day with ISO timestamps

### 2. **24-Hour Data**
- **Before**: Incorrect date range calculation and missing time dimensions
- **After**: Proper 24-hour rolling window with `time` dimension and `time_labels` enabled

### 3. **30-Day Data**
- **Before**: Missing time dimensions and improper data transformation
- **After**: Uses `30d` preset with `time` dimension and proper time series handling

### 4. **Query Structure**
- **Before**: Hardcoded query parameters
- **After**: Proper query builders following Plausible API v2 specification

## API Endpoints

### `/api/plausible/realtime?type=realtime`
Returns current day visitor count.

**Query Structure:**
```json
{
  "site_id": "your-site.com",
  "metrics": ["visitors"],
  "date_range": ["2024-01-15T00:00:00.000Z", "2024-01-15T23:59:59.999Z"],
  "include": {
    "time_labels": false,
    "total_rows": false
  }
}
```

### `/api/plausible/realtime?type=24h`
Returns hourly visitor data for the last 24 hours.

**Query Structure:**
```json
{
  "site_id": "your-site.com",
  "metrics": ["visitors"],
  "date_range": ["2024-01-14T12:00:00.000Z", "2024-01-15T12:00:00.000Z"],
  "dimensions": ["time"],
  "include": {
    "time_labels": true,
    "total_rows": false
  }
}
```

### `/api/plausible/realtime?type=30d`
Returns daily visitor data for the last 30 days.

**Query Structure:**
```json
{
  "site_id": "your-site.com",
  "metrics": ["visitors"],
  "date_range": "30d",
  "dimensions": ["time"],
  "include": {
    "time_labels": true,
    "total_rows": false
  }
}
```

## Environment Variables

Make sure these environment variables are set in your `.env.local` file:

```bash
PLAUSIBLE_API_KEY=your-plausible-api-key-here
PLAUSIBLE_SITE_ID=your-site-id-here
```

## How to Get Plausible API Key

1. Log in to your Plausible Analytics account
2. Go to Settings → API Keys
3. Click "New API Key"
4. Choose "Stats API"
5. Copy the generated key (it's only shown once)

## Rate Limits

- **Default**: 600 requests per hour
- **Realtime**: Updates every 30 seconds
- **24h data**: Cached for 5 minutes
- **30d data**: Cached for 30 minutes

## Data Transformation

The API automatically transforms Plausible's response format into chart-friendly data structures:

- **Realtime**: Returns single visitor count
- **24h**: Returns array of 24 objects with `{ hour: 0-23, visitors: number }`
- **30d**: Returns array of 30 objects with `{ day: 1-30, visitors: number }`

## Error Handling

- Graceful fallback to cached data when API fails
- Mock data generation when Plausible is not configured
- Comprehensive logging for debugging
- Type-safe response handling

## Testing

To test the API:

1. Set up your environment variables
2. Visit `/api/plausible/realtime?type=config` to verify configuration
3. Test each endpoint: `realtime`, `24h`, `30d`
4. Check browser console for detailed logging

## Troubleshooting

### Common Issues

1. **"No API key configured"**
   - Check your `.env.local` file
   - Verify `PLAUSIBLE_API_KEY` is set

2. **"Invalid site ID"**
   - Ensure `PLAUSIBLE_SITE_ID` matches your Plausible domain
   - Site ID should be your domain (e.g., "example.com")

3. **"Rate limit exceeded"**
   - Reduce polling frequency
   - Increase cache TTL values

4. **"Invalid response format"**
   - Check Plausible API status
   - Verify your API key permissions

### Debug Mode

The API includes extensive logging. Check your server console for:
- Request details
- Response parsing
- Data transformation steps
- Error details

## Migration Notes

If you're upgrading from the old implementation:

1. **No breaking changes** - API endpoints remain the same
2. **Improved data accuracy** - Proper time dimensions and date ranges
3. **Better error handling** - Graceful fallbacks and detailed logging
4. **Type safety** - Full TypeScript support with proper interfaces

## Support

For Plausible API issues, refer to:
- [Plausible Stats API Documentation](https://plausible.io/docs/stats-api)
- [Plausible Support](https://plausible.io/support)
