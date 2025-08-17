# README Updater Function

This Appwrite Function automatically updates the README.md file in your GitHub repository with the top 5 highest-scoring posts from your Refetch application.

## 🚀 Features

- **Automatic Updates**: Fetches top 5 posts by ranking score from Appwrite
- **GitHub Integration**: Uses GitHub API to update README without git operations
- **Smart Formatting**: Creates beautiful, formatted content with medals and metadata
- **Placeholder Replacement**: Automatically replaces `{{news}}` placeholder in README
- **Scheduled Execution**: Can be configured to run on a schedule (e.g., daily)
- **Error Handling**: Comprehensive error handling and logging

## 📋 Prerequisites

- Appwrite project with posts collection
- GitHub repository with README.md file
- GitHub Personal Access Token with repo permissions
- Appwrite API key with database read permissions

## 🔧 Setup

### 1. Environment Variables

Configure these environment variables in your Appwrite Function:

#### Appwrite Configuration
```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://your-appwrite-endpoint.com
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
APPWRITE_DATABASE_ID=your_database_id
APPWRITE_POSTS_COLLECTION_ID=your_posts_collection_id
```

#### GitHub Configuration
```env
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_OWNER=your_github_username_or_org
GITHUB_REPO=your_repository_name
GITHUB_BRANCH=main  # Optional, defaults to 'main'
```

### 2. GitHub Token Setup

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with `repo` scope
3. Copy the token and add it to your function's environment variables

### 3. Appwrite API Key Setup

1. Go to your Appwrite Console → API Keys
2. Create a new API key with the following scopes:
   - `databases.read`
   - `collections.read`
   - `documents.read`
3. Copy the key and add it to your function's environment variables

## 📦 Dependencies

The function uses these npm packages:

- `node-appwrite`: Appwrite SDK for Node.js (v17.2.0)
- `octokit`: GitHub REST API client

## 🚀 Deployment

### 1. Deploy via Appwrite Console

1. Go to your Appwrite Console
2. Navigate to **Functions**
3. Click **Create Function**
4. Fill in the details:
   - **Name**: `readme-updater`
   - **Runtime**: `Node.js 18`
   - **Entrypoint**: `index.js`
5. Upload the function files
6. Set build command: `npm install`
7. Add all required environment variables
8. Deploy the function

### 2. Configure Function Settings

#### Scopes
Configure the scopes your function needs:
- Navigate to **Settings** > **Scopes**
- Select: `databases.read`, `collections.read`, `documents.read`

#### Triggers
Configure how the function is invoked:

**Scheduled Execution (Recommended)**
- **Type**: Schedule
- **Cron Expression**: `0 9 * * *` (Daily at 9 AM UTC)
- **Timezone**: UTC

**HTTP Invocation**
- **Type**: HTTP
- **URL**: Generated function URL for manual testing

**Event Triggers**
- **Type**: Event
- **Events**: Database document updates (if you want real-time updates)

## 📊 How It Works

1. **Fetch Posts**: Retrieves top 5 posts by ranking score from Appwrite
2. **Format Content**: Creates formatted HTML content with medals and metadata
3. **Get Current README**: Fetches existing README content from GitHub
4. **Update Content**: Replaces `{{news}}` placeholder or adds new section
5. **Commit Changes**: Commits updated README to GitHub with bot signature

## 🎯 README Template

Your README.md should include the `{{news}}` placeholder where you want the top posts to appear:

```markdown
**Refetch** was born from a simple yet powerful idea...

{{news}}

### What We're Building
```

If no placeholder is found, the function will add the news section after the description.

## 📝 Output Format

The function generates content like this:

```markdown
## 🔥 Top Posts Today (Monday, January 15, 2024)

*Auto-updated with the highest-scoring community content*

**🥇 [Amazing Tech Article](https://example.com/article)**
📊 Score: **42** | ⏰ 2 hours ago | 👤 John Doe

**🥈 [Another Great Post](https://example.com/post)**
📊 Score: **38** | ⏰ 5 hours ago | 👤 Jane Smith

**🥉 [Interesting Content](https://example.com/content)**
📊 Score: **35** | ⏰ 1 day ago | 👤 Anonymous

**⭐ [Fourth Post](https://example.com/fourth)**
📊 Score: **28** | ⏰ 2 days ago | 👤 Bob Wilson

**⭐ [Fifth Post](https://example.com/fifth)**
📊 Score: **25** | ⏰ 3 days ago | 👤 Alice Brown

---

*Last updated: 2024-01-15T09:00:00.000Z*
```

## 🧪 Testing

### Manual Testing

1. Deploy the function
2. Use the generated HTTP URL to test manually
3. Check the function logs for execution details
4. Verify the README was updated on GitHub

### Local Testing

You can test the function locally using Appwrite CLI:

```bash
# Install Appwrite CLI
npm install -g appwrite-cli

# Login to your Appwrite instance
appwrite login

# Test function locally
appwrite functions createExecution --functionId YOUR_FUNCTION_ID
```

## 📊 Monitoring

- Check function logs in the **Executions** tab
- Monitor GitHub repository for README updates
- Set up alerts for function failures
- Track execution frequency and success rate

## 🔒 Security Considerations

- **GitHub Token**: Use minimal required permissions (repo scope only)
- **Appwrite API Key**: Restrict to read-only database access
- **Environment Variables**: Never expose sensitive values in logs
- **Rate Limiting**: GitHub API has rate limits (5000 requests/hour for authenticated users)

## 🐛 Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   - Check all required variables are set
   - Verify variable names match exactly

2. **GitHub API Errors**
   - Verify token has correct permissions
   - Check repository owner and name
   - Ensure branch exists

3. **Appwrite Connection Issues**
   - Verify endpoint URL and project ID
   - Check API key permissions
   - Ensure collection ID is correct

4. **README Update Failures**
   - Check if README.md exists in repository
   - Verify bot has write permissions
   - Check for merge conflicts

### Debug Mode

Enable detailed logging by checking the function execution logs in Appwrite Console.

## 🔄 Updates and Maintenance

- **Regular Updates**: Keep dependencies updated
- **Monitoring**: Check function execution logs regularly
- **Backup**: Keep a backup of your README template
- **Testing**: Test after major changes to your posts collection

## 📞 Support

If you encounter issues:

1. Check the function execution logs
2. Verify all environment variables are set correctly
3. Test with minimal configuration first
4. Check GitHub and Appwrite API status

## 📄 License

This function is part of the Refetch project and follows the same license terms.
