/**
 * Hello World Appwrite Function
 * 
 * This is a simple function that demonstrates the basic structure
 * of an Appwrite Function with Node.js runtime.
 */

export default async function ({ req, res, log, error }) {
    try {
        // Log to Appwrite Console (only visible to developers)
        log('Hello World function executed successfully!');
        
        // Log request information for debugging
        log(`Request method: ${req.method}`);
        log(`Request headers: ${JSON.stringify(req.headers)}`);
        
        // Check if there's a request body
        if (req.bodyText) {
            log(`Request body: ${req.bodyText}`);
        }
        
        // Return a JSON response
        return res.json({
            message: 'Hello World from Appwrite Function! xoxo',
            timestamp: new Date().toISOString(),
            function: 'hello-world',
            status: 'success'
        });
        
    } catch (err) {
        // Log errors to Appwrite Console
        error(`Error in Hello World function: ${err.message}`);
        
        // Return error response
        return res.json({
            message: 'Error occurred in function',
            error: err.message,
            status: 'error'
        }, 500);
    }
}
