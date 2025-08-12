# Abuse Protection System

## Overview

The abuse protection system prevents users from submitting too many links in a short time period, helping to maintain quality and prevent spam on the platform.

## How It Works

### Submission Limits
- **Maximum submissions**: 5 posts per user
- **Time window**: 16 hours (rolling window)
- **Scope**: Applies to all post types (link, show, job)

### Implementation Details

The system is implemented in `app/api/submit/route.ts` and includes:

1. **User Submission Count Check**: Before creating a new post, the system queries the database to count how many posts the user has created in the last 16 hours.

2. **Time Window Calculation**: Uses a rolling 16-hour window from the current time, calculated as:
   ```typescript
   const sixteenHoursAgo = new Date(Date.now() - (16 * 60 * 60 * 1000))
   ```

3. **Database Query**: Uses Appwrite's `listDocuments` with filters:
   - `Query.equal('userId', userId)` - matches the specific user
   - `Query.greaterThan('$createdAt', sixteenHoursAgo.toISOString())` - only includes recent posts

4. **Response Handling**: 
   - **Allowed**: If user has < 5 submissions in the last 16 hours
   - **Blocked**: If user has >= 5 submissions in the last 16 hours (returns HTTP 429)

### Error Handling

- If the abuse protection check fails (e.g., database error), the system defaults to allowing the submission to avoid blocking legitimate users
- Comprehensive logging is included for monitoring and debugging

### Configuration

The limits can be easily adjusted by modifying these constants in `app/api/submit/route.ts`:

```typescript
const MAX_SUBMISSIONS_PER_16_HOURS = 5
const SUBMISSION_WINDOW_HOURS = 16
```

## Testing

A test file is available at `lib/abuseProtection.test.ts` that can be run with:

```bash
npx tsx lib/abuseProtection.test.ts
```

The test covers various scenarios:
- Users with 0-6 submissions in the time window
- Time window calculation accuracy
- Edge cases and error handling

## Monitoring

The system includes comprehensive logging:
- User submission counts and limits
- When limits are exceeded
- Time window calculations
- Error conditions

## Security Considerations

- Uses server-side validation (cannot be bypassed by client-side manipulation)
- Integrates with existing JWT authentication
- Graceful degradation on errors (allows submissions if check fails)
- Rate limiting is per-user, not per-IP

## Future Enhancements

Potential improvements could include:
- Per-IP rate limiting
- Dynamic limits based on user reputation
- Admin override capabilities
- More sophisticated spam detection
- Configurable time windows per post type
