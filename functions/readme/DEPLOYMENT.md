# README Updater Function - Deployment Guide

This guide walks you through deploying the README Updater function to Appwrite and configuring it to automatically update your GitHub README.

## 🚀 Quick Start

### 1. Prerequisites Checklist

- [ ] Appwrite project with posts collection
- [ ] GitHub repository with README.md
- [ ] GitHub Personal Access Token
- [ ] Appwrite API key with database permissions

### 2. One-Click Deployment

If you have Appwrite CLI installed:

```bash
# Clone the function
git clone <your-repo>
cd functions/readme-updater

# Deploy to Appwrite
appwrite functions create \
  --name "readme-updater" \
  --runtime "node-18" \
  --entrypoint "index.js"

# Set environment variables
appwrite functions createVariable \
  --functionId <FUNCTION_ID> \
  --key "GITHUB_TOKEN" \
  --value "<YOUR_GITHUB_TOKEN>"

# ... repeat for other variables
```

## 📋 Detailed Setup

### Step 1: GitHub Token Setup

1. **Generate Personal Access Token**
   - Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
   - Click "Generate new token (classic)"
   - Give it a descriptive name: "Refetch README Updater"
   - Select scopes: `repo` (full control of private repositories)
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again)

2. **Verify Token Permissions**
   - The token needs `repo` scope to read and write repository content
   - Test with: `curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user`

### Step 2: Appwrite API Key Setup

1. **Create API Key**
   - Go to your Appwrite Console → API Keys
   - Click "Create API Key"
   - Name: "README Updater Function"
   - Select scopes:
     - `databases.read`
     - `collections.read`
     - `documents.read`
   - Click "Create API Key"
   - Copy the key and endpoint

2. **Verify Database Access**
   - Ensure your posts collection exists
   - Verify the collection has these attributes:
     - `title` (string)
     - `url` (string)
     - `score` (number)
     - `createdAt` (datetime)
     - `author` (string, optional)

### Step 3: Function Deployment

1. **Create Function in Appwrite**
   - Go to Appwrite Console → Functions
   - Click "Create Function"
   - Fill in details:
     ```
     Name: readme-updater
     Runtime: Node.js 18
     Entrypoint: index.js
     ```

2. **Upload Function Files**
   - Upload the entire `readme-updater` folder
   - Or connect to your Git repository
   - Set build command: `npm install`

3. **Configure Environment Variables**
   - Go to Settings → Environment Variables
   - Add each variable:

   **Appwrite Configuration:**
   ```
   APPWRITE_ENDPOINT=https://your-appwrite-endpoint.com
   APPWRITE_PROJECT_ID=your_project_id
   APPWRITE_API_KEY=your_api_key
   APPWRITE_DATABASE_ID=your_database_id
   APPWRITE_POSTS_COLLECTION_ID=your_posts_collection_id
   ```


   **GitHub Configuration:**
   ```
   GITHUB_TOKEN=your_github_personal_access_token
   GITHUB_OWNER=your_github_username_or_org
   GITHUB_REPO=your_repository_name
   GITHUB_BRANCH=main
   ```

4. **Set Function Scopes**
   - Go to Settings → Scopes
   - Select:
     - `databases.read`
     - `collections.read`
     - `documents.read`

### Step 4: Configure Triggers

1. **Scheduled Execution (Recommended)**
   - Go to Settings → Triggers
   - Click "Add Trigger"
   - Type: Schedule
   - Cron Expression: `0 9 * * *` (Daily at 9 AM UTC)
   - Timezone: UTC

2. **HTTP Trigger (for Testing)**
   - Type: HTTP
   - This gives you a URL to test manually

3. **Event Trigger (Optional)**
   - Type: Event
   - Events: Database document updates
   - This runs the function whenever posts are updated

### Step 5: Deploy and Test

1. **Deploy Function**
   - Click "Deploy" button
   - Wait for build to complete
   - Check for any build errors

2. **Test Function**
   - Use the HTTP trigger URL to test manually
   - Check function logs for execution details
   - Verify README was updated on GitHub

## 🔧 Configuration Examples

### Daily Updates at 9 AM UTC
```cron
0 9 * * *
```

### Every 6 Hours
```cron
0 */6 * * *
```

### Weekdays Only at 8 AM UTC
```cron
0 8 * * 1-5
```

### Every Hour During Business Hours
```cron
0 9-17 * * 1-5
```

## 🧪 Testing Your Deployment

### 1. Manual Test
```bash
# Get your function URL from Appwrite Console
curl -X POST "https://your-appwrite-endpoint.com/v1/functions/YOUR_FUNCTION_ID/executions" \
  -H "X-Appwrite-Project: YOUR_PROJECT_ID" \
  -H "Content-Type: application/json"
```

### 2. Check Logs
- Go to Appwrite Console → Functions → readme-updater → Executions
- Look for recent executions
- Check logs for any errors

### 3. Verify GitHub Update
- Check your repository's README.md
- Look for the new "Top Posts Today" section
- Verify the commit message shows "Refetch Bot"

## 🚨 Troubleshooting

### Common Deployment Issues

1. **Build Failures**
   ```bash
   # Check build logs
   # Ensure all files are uploaded
   # Verify package.json is correct
   ```

2. **Environment Variable Errors**
   ```bash
   # Check variable names match exactly
   # Verify no extra spaces
   # Test values manually
   ```

3. **Permission Errors**
   ```bash
   # Verify GitHub token has repo scope
   # Check Appwrite API key permissions
   # Ensure collection IDs are correct
   ```

4. **Function Execution Errors**
   ```bash
   # Check function logs
   # Verify all dependencies are installed
   # Test with minimal configuration
   ```

### Debug Mode

Enable detailed logging by checking the function execution logs in Appwrite Console. Look for:

- Environment variable values (masked)
- API request/response details
- Error stack traces
- Execution timing

## 📊 Monitoring and Maintenance

### Daily Checks
- [ ] Function executed successfully
- [ ] README updated on GitHub
- [ ] No errors in logs
- [ ] Posts are being fetched correctly

### Weekly Checks
- [ ] Function performance metrics
- [ ] GitHub API rate limit usage
- [ ] Environment variable validity
- [ ] Dependencies up to date

### Monthly Checks
- [ ] Review function logs for patterns
- [ ] Update dependencies if needed
- [ ] Verify GitHub token hasn't expired
- [ ] Check Appwrite API key permissions

## 🔒 Security Best Practices

1. **GitHub Token**
   - Use minimal required permissions
   - Rotate tokens regularly
   - Never commit tokens to code

2. **Appwrite API Key**
   - Restrict to read-only access
   - Use function-specific keys
   - Monitor usage patterns

3. **Environment Variables**
   - Never log sensitive values
   - Use Appwrite's built-in encryption
   - Regular security audits

## 📞 Getting Help

If you encounter issues:

1. **Check the logs first** - Most issues are visible in function execution logs
2. **Verify configuration** - Double-check all environment variables
3. **Test incrementally** - Start with minimal setup, add complexity gradually
4. **Community support** - Check Appwrite and GitHub documentation

## 🎯 Next Steps

After successful deployment:

1. **Monitor the first few executions** to ensure everything works
2. **Customize the schedule** based on your needs
3. **Set up alerts** for function failures
4. **Consider adding more features** like:
   - Multiple repository support
   - Custom formatting options
   - Analytics and reporting
   - A/B testing different formats

## 📚 Additional Resources

- [Appwrite Functions Documentation](https://appwrite.io/docs/functions)
- [GitHub REST API Reference](https://docs.github.com/en/rest)
- [Cron Expression Generator](https://crontab.guru/)
- [Appwrite Community Discord](https://discord.gg/appwrite)
