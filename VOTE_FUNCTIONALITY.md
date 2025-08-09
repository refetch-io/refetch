# Vote Functionality Implementation

This document describes the implementation of the upvote/downvote functionality for posts on Refetch.

## Overview

The vote system allows authenticated users to upvote or downvote posts. Each vote is stored in a separate votes collection and the post's score is updated accordingly. The UI uses optimistic updates for a smooth user experience.

## Architecture

### Frontend Components
- **Vote Buttons**: Located in `app/(main)/client-page.tsx` and `app/(main)/threads/[id]/thread-client-page.tsx`
- **Vote Handler**: `lib/voteHandler.ts` - Handles API calls to the vote endpoint with optimistic updates
- **Authentication**: Uses Appwrite JWT tokens for user authentication (same pattern as submit page)

### Backend API
- **Vote Endpoint**: `app/api/vote/route.ts` - Handles vote submissions
- **Authentication**: Validates JWT tokens using Appwrite Account service
- **Database Operations**: Uses Appwrite Databases service for vote storage and post score updates

## Database Schema

### Posts Collection
- `countUp`: Number of upvotes
- `countDown`: Number of downvotes
- `count`: Total score (upvotes - downvotes)
- Other fields: title, description, userId, etc.

### Votes Collection
- `userId`: ID of the user who voted (String, required)
- `postId`: ID of the post being voted on (String, required)
- `count`: Vote value (Integer, default: 0)
  - `1` for upvote
  - `-1` for downvote

## Environment Variables

Add the following to your `.env` file:

```env
APPWRITE_VOTES_COLLECTION_ID=68910fc60001839e0ada
```

## API Endpoint

### POST /api/vote

**Request Body:**
```json
{
  "postId": "string",
  "voteType": "up" | "down"
}
```

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Response:**
```json
{
  "message": "Vote submitted successfully",
  "action": "added" | "updated" | "removed",
  "voteType": "up" | "down" | null
}
```

## Vote Logic

1. **New Vote**: Creates a vote record with count=1 (upvote) or count=-1 (downvote) and updates the post's count field
2. **Same Vote**: Removes the vote record and decrements the post's count field
3. **Different Vote**: Updates the vote record count and adjusts the post's count field accordingly

The `count` field represents the total score (upvotes - downvotes) and is updated directly instead of maintaining separate `countUp` and `countDown` fields.

## Optimistic Updates

The frontend implements optimistic updates for a smooth user experience:

1. **Immediate UI Update**: Vote count changes immediately when user clicks
2. **Background API Call**: API call happens in the background
3. **Error Handling**: If API call fails, the UI reverts to the previous state
4. **No Page Reloads**: UI updates happen without refreshing the page

### Implementation Details

- **Thread Page**: Uses `useState` to track optimistic score
- **Main Page**: Uses a record to track optimistic scores for all items in the virtualized list
- **Error Reversion**: Failed API calls automatically revert the optimistic update

## Security

- JWT token validation ensures only authenticated users can vote
- User can only vote once per post (subsequent votes update or remove the previous vote)
- All database operations are performed server-side with API key authentication

## Usage

1. Users must be logged in to vote
2. Click the upvote (↑) or downvote (↓) button on any post
3. Vote count updates immediately (optimistic update)
4. Users can change their vote or remove it by clicking the same button again
5. If the API call fails, the vote count reverts to the previous state

## Error Handling

- Invalid JWT tokens return 401 Unauthorized
- Missing required fields return 400 Bad Request
- Database errors return 500 Internal Server Error
- Frontend errors are logged to console and optimistic updates are reverted
