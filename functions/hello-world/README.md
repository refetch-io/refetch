# Hello World Function

A simple Appwrite Function that demonstrates basic logging and response handling.

## What it does

- Logs execution details to Appwrite Console
- Returns a JSON response with timestamp
- Demonstrates proper error handling
- Shows request information logging

## Usage

### HTTP Invocation
```bash
# Basic call
curl https://your-function-url.appwrite.global/

# With type parameter
curl "https://your-function-url.appwrite.global/?type=json"
```

### Expected Response
```json
{
  "message": "Hello World from Appwrite Function!",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "function": "hello-world",
  "status": "success"
}
```

### Scheduled Execution
Set up a cron schedule in Appwrite Console:
- **Every minute**: `* * * * *`
- **Every hour**: `0 * * * *`
- **Daily at midnight**: `0 0 * * *`

### Event Trigger
Configure to run on specific Appwrite events:
- Database document creation
- User registration
- File uploads
- Custom events

## Logs

The function logs the following information to Appwrite Console:
- Execution success message
- Request method (GET, POST, etc.)
- Request headers
- Request body (if present)
- Any errors that occur

## Customization

To modify this function:
1. Edit the `index.js` file
2. Add your business logic
3. Update the response format as needed
4. Add additional logging for debugging
5. Deploy the updated function

## Testing

Test the function with different scenarios:
- Empty requests
- Requests with body data
- Invalid data handling
- Error conditions
