# Function Template

This is a template for creating new Appwrite Functions. Copy this directory and customize it for your specific use case.

## Quick Start

1. Copy this `template/` directory
2. Rename it to your function name
3. Update the files with your specific logic
4. Deploy to Appwrite

## Files to Customize

- `package.json` - Update name, description, and dependencies
- `index.js` - Add your business logic
- `README.md` - Document your function's purpose and usage

## Function Structure

```javascript
export default async function ({ req, res, log, error }) {
    try {
        // Your logic here
        
        return res.json({
            message: 'Success',
            timestamp: new Date().toISOString(),
            status: 'success'
        });
        
    } catch (err) {
        error(`Error: ${err.message}`);
        return res.json({
            message: 'Error occurred',
            error: err.message,
            status: 'error'
        }, 500);
    }
}
```

## Common Patterns

### Scheduled Tasks
```javascript
// Check if this is a scheduled execution
if (req.headers['x-appwrite-trigger'] === 'schedule') {
    // Handle scheduled task
}
```

### Event-Driven
```javascript
// Check the triggering event
const event = req.headers['x-appwrite-event'];
if (event === 'databases.*.collections.*.documents.*.create') {
    // Handle document creation
}
```

### HTTP Requests
```javascript
// Handle different HTTP methods
switch (req.method) {
    case 'GET':
        // Handle GET request
        break;
    case 'POST':
        // Handle POST request
        break;
}
```

## Next Steps

1. Implement your specific business logic
2. Add any required dependencies to package.json
3. Test locally if possible
4. Deploy to Appwrite
5. Configure triggers and permissions
6. Monitor execution logs
