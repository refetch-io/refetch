# Appwrite Functions

This directory contains Appwrite Functions for handling background and scheduled tasks.

## Functions

### hello-world
A simple function that demonstrates the basic structure of an Appwrite Function with Node.js runtime.

## Deployment Instructions

### 1. Prerequisites
- Appwrite Console access
- Node.js 18+ runtime available in your Appwrite project

### 2. Deploy via Appwrite Console

1. Go to your Appwrite Console
2. Navigate to **Functions**
3. Click **Create Function**
4. Fill in the details:
   - **Name**: `hello-world`
   - **Runtime**: `Node.js 18`
   - **Entrypoint**: `index.js`
5. Upload the function files or connect to Git repository
6. Set build command: `npm install` (if needed)
7. Deploy the function

### 3. Configure Function Settings

#### Scopes (for Dynamic API Key)
Configure the scopes your function needs:
- Navigate to **Settings** > **Scopes**
- Select only necessary permissions for your use case

#### Environment Variables
Add any required environment variables in **Settings** > **Environment Variables**

#### Triggers
Configure how the function is invoked:
- **HTTP**: For manual invocation or webhook calls
- **Schedule**: For recurring tasks (cron-like syntax)
- **Event**: For Appwrite events (database changes, user actions, etc.)

### 4. Testing the Function

#### HTTP Invocation
- Use the generated function URL
- Test with different query parameters:
  - `/?type=json` - Returns JSON response
  - `/?type=text` - Returns text response
  - `/` - Returns default response

#### Scheduled Execution
- Set up a cron schedule in the function settings
- Monitor executions in the **Executions** tab

#### Event Triggers
- Configure database, user, or other Appwrite events
- Function will automatically execute when events occur

## Function Structure

Each function follows this pattern:
```
function-name/
├── package.json          # Dependencies and metadata
├── index.js             # Main function entry point
└── README.md            # Function-specific documentation
```

## Best Practices

1. **Error Handling**: Always wrap your code in try-catch blocks
2. **Logging**: Use `log()` and `error()` methods for debugging
3. **Security**: Only grant necessary scopes to functions
4. **Dependencies**: Keep dependencies minimal and up-to-date
5. **Testing**: Test functions locally before deployment

## Local Development

You can test functions locally using the Appwrite CLI:
```bash
# Install Appwrite CLI
npm install -g appwrite-cli

# Login to your Appwrite instance
appwrite login

# Test function locally
appwrite functions createExecution --functionId YOUR_FUNCTION_ID
```

## Monitoring

- Check function logs in the **Executions** tab
- Monitor function performance and errors
- Set up alerts for function failures
- Use Appwrite's built-in analytics

## Next Steps

After deploying the hello-world function:
1. Test it works correctly
2. Create more complex functions for your specific use cases
3. Set up scheduled functions for background tasks
4. Configure event-driven functions for real-time processing
