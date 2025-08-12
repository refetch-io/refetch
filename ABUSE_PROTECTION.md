# Abuse Protection System

## Overview

The abuse protection system prevents users from submitting too many posts or comments in a short time period, helping to maintain quality and prevent spam on the platform.

## How It Works

### Post Submission Limits
- **Maximum submissions**: 5 posts per user
- **Time window**: 16 hours (rolling window)
- **Scope**: Applies to all post types (link, show, job)

### Comment Limits
- **Maximum comments**: 50 comments per user
- **Time window**: 1 hour (rolling window)
- **Scope**: Applies to all comment types

### Comment Fetching Limits
- **Maximum comments per post**: 500 comments
- **Scope**: When retrieving comments for a specific post
- **Note**: This is a fetch limit, not a creation limit

### Implementation Details

The system is implemented in two main files:

#### 1. Post Submissions (`app/api/submit/route.ts`)
1. **User Submission Count Check**: Before creating a new post, the system queries the database to count how many posts the user has created in the last 16 hours.

2. **Time Window Calculation**: Uses a rolling 16-hour window from the current time, calculated as:
   ```typescript
   const sixteenHoursAgo = new Date(Date.now() - (16 * 60 * 60 * 1000))
   ```

3. **Database Query**: Uses Appwrite's `listDocuments` with filters:
   - `Query.equal('userId', userId)` - matches the specific user
   - `Query.greaterThan('$createdAt', sixteenHoursAgo.toISOString())` - only includes recent posts

#### 2. Comments (`app/api/comments/route.ts`)
1. **User Comment Count Check**: Before creating a new comment, the system queries the database to count how many comments the user has created in the last hour.

2. **Time Window Calculation**: Uses a rolling 1-hour window from the current time, calculated as:
   ```typescript
   const oneHourAgo = new Date(Date.now() - (1 * 60 * 60 * 1000))
   ```

3. **Database Query**: Uses Appwrite's `listDocuments` with filters:
   - `Query.equal('userId', userId)` - matches the specific user
   - `Query.greaterThan('$createdAt', oneHourAgo.toISOString())` - only includes recent comments

4. **Comment Fetching**: When retrieving comments for a post, uses:
   - `Query.equal('postId', postId)` - matches the specific post
   - `Query.orderDesc('$createdAt')` - orders by creation time (newest first)
   - `Query.limit(500)` - fetches up to 500 comments

### Response Handling

#### Post Submissions
- **Allowed**: If user has < 5 submissions in the last 16 hours
- **Blocked**: If user has >= 5 submissions in the last 16 hours (returns HTTP 429)

#### Comments
- **Allowed**: If user has < 50 comments in the last hour
- **Blocked**: If user has >= 50 comments in the last hour (returns HTTP 429)

#### Comment Fetching
- **Response includes**: Array of comments + metadata with count and limits
- **Metadata fields**: `totalComments`, `maxCommentsPerRequest`, `postId`

### Error Handling

- If the abuse protection check fails (e.g., database error), the system defaults to allowing the submission/comment to avoid blocking legitimate users
- Comprehensive logging is included for monitoring and debugging

### Configuration

The limits can be easily adjusted by modifying these constants:

#### Post Submissions (`app/api/submit/route.ts`)
```typescript
const MAX_SUBMISSIONS_PER_16_HOURS = 5
const SUBMISSION_WINDOW_HOURS = 16
```

#### Comments (`app/api/comments/route.ts`)
```typescript
const MAX_COMMENTS_PER_HOUR = 50
const COMMENT_WINDOW_HOURS = 1
const MAX_COMMENTS_PER_POST = 500
```

## Testing

Test files are available for both systems:

### Post Submissions
```bash
npx tsx lib/abuseProtection.test.ts
```

### Comments
```bash
npx tsx lib/commentAbuseProtection.test.ts
```

The tests cover various scenarios:
- Users with different submission/comment counts in the time windows
- Time window calculation accuracy
- Edge cases and error handling

## Monitoring

The system includes comprehensive logging:
- User submission/comment counts and limits
- When limits are exceeded
- Time window calculations
- Comment fetching counts and limits
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
- Configurable time windows per post/comment type
- Integration with user moderation systems
- Pagination for posts with more than 500 comments
- Comment search and filtering capabilities
