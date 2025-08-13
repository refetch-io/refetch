# Scout Function Deployment Guide

This guide walks you through deploying the Scout Function to Appwrite, which will automatically discover and add high-quality tech articles to your refetch database.

## Prerequisites

Before deploying, ensure you have:

1. **Appwrite Console Access** - Admin access to your Appwrite project
2. **OpenAI API Key** - Valid API key with GPT-4 access
3. **Database Setup** - Your posts and comments collections are already created
4. **User Account** - A dedicated user account for the scout function

## Step 1: Create Scout User Account

First, create a dedicated user account that will be the author of all auto-discovered articles:

1. Go to your Appwrite Console → **Users**
2. Click **Create User**
3. Fill in the details:
   - **User ID**: `scout-user` (or your preferred ID)
   - **Email**: `scout@yourdomain.com` (or any valid email)
   - **Password**: Generate a strong password
   - **Name**: `Scout`
4. Click **Create**
5. **Important**: Copy the User ID - you'll need it for environment variables

## Step 2: Deploy the Function

### 2.1 Create Function in Appwrite Console

1. Go to your Appwrite Console → **Functions**
2. Click **Create Function**
3. Fill in the basic details:
   - **Name**: `scout`
   - **Runtime**: `Node.js 18`
   - **Entrypoint**: `index.js`
4. Click **Create**

### 2.2 Upload Function Files

1. In your function settings, go to **Settings** → **Source Code**
2. Upload the following files:
   - `index.js`
   - `package.json`
   - `README.md`
3. Click **Save**

### 2.3 Build and Deploy

1. Go to **Settings** → **Build & Deploy**
2. Set **Build Command**: `npm install`
3. Click **Deploy**
4. Wait for the build to complete successfully

## Step 3: Configure Function Settings

### 3.1 Set Required Scopes

1. Go to **Settings** → **Scopes**
2. Select the following scopes:
   - `databases.read` - To read existing posts and check for duplicates
   - `databases.write` - To create new posts
   - `users.read` - To read user information

### 3.2 Configure Environment Variables

1. Go to **Settings** → **Environment Variables**
2. Add the following variables:

```bash
# Appwrite Configuration
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id_here
APPWRITE_API_KEY=your_api_key_here
APPWRITE_DATABASE_ID=your_database_id_here
APPWRITE_POSTS_COLLECTION_ID=your_posts_collection_id_here
APPWRITE_COMMENTS_COLLECTION_ID=your_comments_collection_id_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Scout Configuration
SCOUT_USER_ID=scout-user
SCOUT_USER_NAME=Scout
MAX_ARTICLES_PER_RUN=10
SCRAPING_DELAY_MS=2000
```

**Important Notes:**
- Replace all `your_*_here` values with your actual Appwrite configuration
- The `SCOUT_USER_ID` should match the user ID you created in Step 1
- `SCRAPING_DELAY_MS` controls the delay between requests (2000ms = 2 seconds)
- `MAX_ARTICLES_PER_RUN` limits how many articles are added per execution

### 3.3 Get Your Appwrite Configuration

To find your configuration values:

1. **Project ID**: Go to **Settings** → **General** → Copy the Project ID
2. **API Key**: Go to **Settings** → **API Keys** → Create a new key with appropriate scopes
3. **Database ID**: Go to **Databases** → Copy the Database ID
4. **Collection IDs**: Go to **Databases** → Your Database → Copy the Collection IDs for posts and comments

## Step 4: Test the Function

### 4.1 Manual Test

1. Go to **Executions** tab
2. Click **Create Execution**
3. Leave the request body empty (or use `{}`)
4. Click **Execute**
5. Monitor the execution logs for any errors

### 4.2 Check Execution Logs

Look for these success indicators:
```
Starting scout function...
Step 1: Scraping websites for articles...
Found X articles from TechCrunch
Found X articles from The Verge
...
Step 2: Fetching article content...
Step 3: Analyzing articles with AI...
Step 4: Filtering articles based on quality...
Step 5: Adding articles to database...
Successfully added article: [Article Title]
Scout function completed successfully!
```

### 4.3 Verify Database

1. Go to **Databases** → Your Database → Posts Collection
2. Look for new articles with author "Refetch Scout"
3. Check that the articles have proper metadata and enhanced fields

## Step 5: Set Up Scheduled Execution

### 5.1 Configure Schedule

1. Go to **Settings** → **Triggers**
2. Click **Add Trigger**
3. Select **Schedule**
4. Set the cron expression:
   - **Every 6 hours**: `0 */6 * * *`
   - **Every 12 hours**: `0 */12 * * *`
   - **Daily at 2 AM**: `0 2 * * *`
5. Click **Create**

### 5.2 Recommended Schedule

For most use cases, we recommend running every 6-12 hours:
- **6 hours**: More frequent updates, higher resource usage
- **12 hours**: Balanced approach, moderate resource usage
- **24 hours**: Minimal resource usage, less frequent updates

## Step 6: Monitor and Optimize

### 6.1 Monitor Executions

1. Check **Executions** tab regularly
2. Look for failed executions and error logs
3. Monitor execution time and resource usage

### 6.2 Check Database Growth

1. Monitor how many articles are being added
2. Check article quality and relevance
3. Adjust quality thresholds if needed

### 6.3 Review AI Analysis

1. Check the enhanced metadata fields
2. Verify article classification (link vs show)
3. Review quality scores and spam detection

## Troubleshooting

### Common Issues

#### 1. Build Failures
```
Error: npm install failed
```
**Solution**: Check that all dependencies are properly specified in `package.json`

#### 2. Environment Variable Errors
```
Missing required environment variables: APPWRITE_ENDPOINT
```
**Solution**: Verify all environment variables are set correctly

#### 3. Permission Errors
```
Error: Insufficient permissions
```
**Solution**: Check that your API key has the required scopes

#### 4. OpenAI API Errors
```
Error: Invalid API key
```
**Solution**: Verify your OpenAI API key is valid and has sufficient credits

#### 5. Rate Limiting
```
Error: Too many requests
```
**Solution**: Increase `SCRAPING_DELAY_MS` to 5000 or higher

### Performance Optimization

#### 1. Reduce Execution Time
- Decrease `MAX_ARTICLES_PER_RUN` to 5-8
- Increase `SCRAPING_DELAY_MS` to reduce rate limiting
- Use fewer target websites initially

#### 2. Improve Success Rate
- Monitor which websites are failing
- Adjust selectors for better content extraction
- Check for website structure changes

#### 3. Quality Control
- Adjust quality thresholds in the code
- Review AI analysis results
- Fine-tune the system prompt if needed

## Security Considerations

### 1. API Key Security
- Use environment variables, never hardcode keys
- Rotate API keys regularly
- Use minimal required scopes

### 2. Rate Limiting
- Respect website rate limits
- Use appropriate delays between requests
- Monitor for IP blocking

### 3. Content Validation
- The AI analysis helps filter inappropriate content
- Monitor added articles for quality
- Have a process for removing problematic content

## Next Steps

After successful deployment:

1. **Monitor Performance**: Check execution logs and database growth
2. **Adjust Settings**: Fine-tune quality thresholds and delays
3. **Add More Websites**: Extend the target website list
4. **Customize AI Prompts**: Adjust the system prompt for your specific needs
5. **Set Up Alerts**: Configure notifications for function failures

## Support

If you encounter issues:

1. Check the execution logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure your Appwrite project has the required permissions
4. Check that your OpenAI API key is valid and has sufficient credits

The Scout Function should now be running automatically and adding high-quality tech articles to your refetch database!
