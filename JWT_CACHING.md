# JWT Caching Implementation

## Overview

This implementation provides a caching wrapper for Appwrite's `createJWT()` function to avoid rate limiting issues. The JWT token is cached in localStorage for 15 minutes, reducing the number of API calls to Appwrite.

## Files Modified

### New Files
- `lib/jwtCache.ts` - Main caching implementation
- `lib/jwtCache.test.ts` - Test file for the caching functionality
- `JWT_CACHING.md` - This documentation

### Modified Files
- `lib/voteHandler.ts` - Updated to use cached JWT
- `app/(main)/submit/page.tsx` - Updated to use cached JWT
- `app/(main)/mines/mines-client-wrapper.tsx` - Updated to use cached JWT
- `contexts/auth-context.tsx` - Added JWT cache clearing on logout

## API

### `getCachedJWT(): Promise<string>`
Returns a JWT token, using the cached version if available and not expired (within 15 minutes).

**Usage:**
```typescript
import { getCachedJWT } from '@/lib/jwtCache'

const jwt = await getCachedJWT()
```

### `clearCachedJWT(): void`
Clears the cached JWT token from localStorage. Useful for logout or when the token becomes invalid.

**Usage:**
```typescript
import { clearCachedJWT } from '@/lib/jwtCache'

clearCachedJWT()
```

### `refreshJWT(): Promise<string>`
Forces a refresh of the JWT token, bypassing the cache and updating it with the new token.

**Usage:**
```typescript
import { refreshJWT } from '@/lib/jwtCache'

const freshJwt = await refreshJWT()
```

## How It Works

1. **First Call**: When `getCachedJWT()` is called for the first time, it calls `account.createJWT()` and caches the result in localStorage with a timestamp.

2. **Subsequent Calls**: For the next 15 minutes, `getCachedJWT()` returns the cached token without making a new API call.

3. **Cache Expiration**: After 15 minutes, the cache is considered expired and a fresh JWT is requested.

4. **Server-Side Rendering**: On the server side (when `window` is undefined), the function bypasses caching and always calls `account.createJWT()`.

5. **Error Handling**: If any error occurs during JWT creation, the error is logged and re-thrown.

## Benefits

- **Rate Limit Protection**: Reduces API calls to Appwrite's `createJWT()` endpoint
- **Performance**: Faster response times for subsequent API calls
- **User Experience**: Smoother interactions without waiting for JWT generation
- **Automatic Cleanup**: Cache is cleared on logout

## Testing

Run the test file to verify the caching functionality:

```bash
npx tsx lib/jwtCache.test.ts
```

## Migration Guide

### Before (Direct Usage)
```typescript
import { account } from '@/lib/appwrite'

const jwtResponse = await account.createJWT()
const jwt = jwtResponse.jwt
```

### After (Cached Usage)
```typescript
import { getCachedJWT } from '@/lib/jwtCache'

const jwt = await getCachedJWT()
```

## Configuration

The cache duration can be modified in `lib/jwtCache.ts`:

```typescript
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes in milliseconds
```

## Security Considerations

- JWT tokens are stored in localStorage, which is appropriate for client-side caching
- Tokens are automatically cleared on logout
- Cache expiration ensures tokens don't persist indefinitely
- Server-side rendering bypasses caching to ensure fresh tokens

## Troubleshooting

1. **Cache not working**: Ensure you're in a browser environment (localStorage is available)
2. **Stale tokens**: Use `refreshJWT()` to force a fresh token
3. **Memory leaks**: The cache is automatically managed, but you can call `clearCachedJWT()` manually if needed
