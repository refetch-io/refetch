# Vote Structure Update Summary

## Overview
Updated the voting system to support both posts and comments with a unified structure that includes `resourceId` and `resourceType` fields.

## New Vote Structure
The votes collection now uses the following structure:
- `userId`: ID of the user who voted
- `resourceId`: ID of the resource being voted on (post or comment)
- `resourceType`: Type of resource ('post' or 'comment')
- `count`: Vote value (1 for upvote, -1 for downvote)

## Files Modified

### 1. Types (`lib/types.ts`)
- Added `VoteDocument` interface for the new vote structure
- Added `VoteRequest` interface for API requests
- Added `VoteState` interface for vote state management

### 2. Vote Handler (`lib/voteHandler.ts`)
- Updated `fetchUserVote` to accept `resourceId` and `resourceType`
- Updated `handleVote` to accept `resourceId` and `resourceType`
- Added `fetchUserVotesForResources` helper function for batch operations
- All functions now work with both posts and comments

### 3. Vote API (`app/api/vote/route.ts`)
- Updated to accept `resourceId` and `resourceType` instead of `postId`
- Added validation for resource types
- Dynamically selects target collection based on resource type
- Updated all database queries to use new structure

### 4. Vote State API (`app/api/vote/state/route.ts`)
- Updated to accept `resourceId` and `resourceType` instead of `postId`
- Added validation for resource types
- Dynamically selects target collection based on resource type

### 5. Batch Vote API (`app/api/vote/batch/route.ts`)
- Updated to accept array of resources with IDs and types
- Added validation for resource types
- Updated queries to use new structure

### 6. Post Card Component (`components/post-card.tsx`)
- Updated to use new vote handler with resource type parameter
- Fixed minor styling issue

### 7. Comment Vote Component (`components/comment-vote.tsx`)
- Updated to use new vote handler with resource type parameter
- Fixed minor styling issue

### 8. Comments Section (`components/comments-section.tsx`)
- Completely refactored to use new vote handler
- Added proper vote state management for comments
- Integrated with authentication system
- Added optimistic updates for better UX

### 9. Main Client Page (`app/(main)/client-page.tsx`)
- Updated to use new vote handler with resource type parameter
- Updated to use `fetchUserVotesForResources` for batch operations
- Simplified vote fetching logic

### 10. Thread Client Page (`app/(main)/threads/[id]/thread-client-page.tsx`)
- Updated to use new vote handler with resource type parameter
- Updated to scan all resource IDs on the page (post + comments)
- Added proper vote state management for all resources
- Integrated with new batch vote fetching

### 11. Data Functions (`lib/data.ts`)
- Updated `fetchVotesForPosts` to use new vote structure
- Updated database queries to use `resourceId` and `resourceType`

## Environment Variables
Added support for `APPWRITE_COMMENTS_COLLECTION_ID` in the vote API endpoints.

## Key Benefits
1. **Unified Structure**: Single voting system for both posts and comments
2. **Better Performance**: Batch operations for fetching multiple votes
3. **Improved UX**: Optimistic updates and proper error handling
4. **Scalability**: Easy to extend to other resource types in the future
5. **Consistency**: Same voting behavior across all resource types

## Migration Notes
- Existing votes in the database need to be migrated to the new structure
- Old `postId` field should be renamed to `resourceId`
- New `resourceType` field should be added with value 'post' for existing votes
- Update any client code that directly calls the old vote endpoints

## Testing
- Test voting on posts
- Test voting on comments
- Test vote state persistence
- Test batch vote fetching
- Test error handling and rollbacks
- Test authentication requirements

## Future Enhancements
- Add support for other resource types (e.g., users, tags)
- Implement vote analytics and reporting
- Add vote moderation features
- Implement vote history for users
