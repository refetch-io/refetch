/**
 * Function Template
 * 
 * This is a template for creating new Appwrite Functions.
 * Copy this directory and customize for your specific use case.
 */

export default async function ({ req, res, log, error }) {
    try {
        // Log function execution
        log('Function executed successfully!');
        
        // Log request information
        log(`Request method: ${req.method}`);
        log(`Request headers: ${JSON.stringify(req.headers)}`);
        
        // Check if there's a request body
        if (req.bodyText) {
            log(`Request body: ${req.bodyText}`);
        }
        
        // TODO: Add your business logic here
        
        // Return success response
        return res.json({
            message: 'Function executed successfully',
            timestamp: new Date().toISOString(),
            function: 'your-function-name',
            status: 'success'
        });
        
    } catch (err) {
        // Log errors to Appwrite Console
        error(`Error in function: ${err.message}`);
        
        // Return error response
        return res.json({
            message: 'Error occurred in function',
            error: err.message,
            status: 'error'
        }, 500);
    }
}
