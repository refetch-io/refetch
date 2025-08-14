# Scout Function

This Appwrite Function automatically scouts tech websites for high-quality articles and adds them to your refetch database. It uses AI analysis to identify the best content that matches your platform's style and quality standards.

## Purpose

The Scout Function:
1. **Scrapes** predefined tech websites for their full HTML content
2. **Analyzes** HTML using OpenAI's GPT-4 to identify valuable articles
3. **Generates** refetch-style titles and discussion starters
4. **Adds** the best articles to your database with minimal metadata
5. **Avoids** duplicates and lets enhancement functions handle detailed analysis

## Target Websites

The function is configured to scan these tech news sources:

### Tech News & Startups
- **TechCrunch** — Startups, funding, product launches
- **The Verge** — Tech, gadgets, culture
- **Ars Technica** — Deep technical reporting
- **Wired** — Tech & culture intersections
- **VentureBeat** — AI, enterprise tech, startups
- **Engadget** — Consumer electronics and gadgets

### Developer & Technical
- **InfoQ** — Developer-oriented articles on architecture, devops, and languages
- **Hacker News** — Community-curated tech news and discussions
- **Lobste.rs** — Alternative tech community with focus on open source
- **Reddit r/programming** — Community-curated developer content

### Scientific & Research
- **Science Daily** — Research and innovation news
- **Nature Technology** — Scientific tech breakthroughs and research

### Platform-Specific Tech
- **9to5Mac** — Apple ecosystem news and analysis
- **9to5Google** — Google and Android ecosystem coverage

### Enterprise & Business Tech
- **The Register** — Snarky but often well-researched tech industry news
- **ZDNet** — Enterprise technology and business IT news

### Emerging Tech & Research
- **MIT Technology Review** — Emerging technologies and their impact

## Features

- **Simple HTML Scraping**: Scrapes full HTML from target websites without complex selectors
- **AI-Powered Analysis**: Uses GPT-4 to analyze HTML and identify valuable content
- **Intelligent Batching**: Automatically splits large URL lists into smaller batches to avoid LLM token limits
- **Retry Logic**: Failed batches are automatically retried with exponential backoff
- **Generic URL Extraction**: Single algorithm that automatically adapts to different site structures
- **Intelligent Pattern Detection**: Adaptive requirements based on URL complexity
- **Refetch-Style Titles**: Generates titles that match the refetch platform style (similar to Hacker News)
- **Discussion Starters**: Automatically creates engaging first comments to kick off discussions
- **Content Classification**: Properly categorizes articles as "link" or "show" types
- **Duplicate Prevention**: Checks existing database to avoid adding duplicate articles
- **Minimal Processing**: Focuses on discovery and initial processing - detailed analysis handled by enhancement functions

## Configuration

### Environment Variables

Set these in your Appwrite Function settings:

```bash
# Appwrite Configuration
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
APPWRITE_DATABASE_ID=your_database_id
APPWRITE_POSTS_COLLECTION_ID=your_posts_collection_id
APPWRITE_COMMENTS_COLLECTION_ID=your_comments_collection_id

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Scout Configuration
SCOUT_USER_ID=your_scout_user_id
SCOUT_USER_NAME=Refetch Scout
MAX_ARTICLES_PER_RUN=10
SCRAPING_DELAY_MS=2000
MAX_URLS_PER_SOURCE=25

# Batching Configuration (Optional)
LLM_MAX_TOKENS=6000
LLM_MAX_BATCH_SIZE=20
LLM_MIN_BATCH_SIZE=5
DEBUG_BATCHING=false
```

### Scout User Setup

Create a dedicated user account for the scout function:
- Username: "Refetch Scout" (or your preferred name)
- This user will be the author of all auto-discovered articles
- Ensure this user has proper permissions

## Batching Configuration

The scout function now uses intelligent batching to avoid exceeding LLM token limits. This is especially important when processing websites with many articles.

### How Batching Works

1. **Per-Source Limiting**: Each source is limited to 25 URLs maximum for balanced coverage
2. **Token Estimation**: Each URL + label is estimated to use ~75 tokens
3. **Batch Calculation**: Optimal batch size is calculated based on available tokens
4. **Processing**: URLs are split into batches and processed sequentially
5. **Retry Logic**: Failed batches are retried up to 2 times with exponential backoff
6. **Rate Limiting**: Delays are added between batches to avoid overwhelming the API

### Batching Environment Variables

```bash
# Maximum URLs per source (default: 25)
MAX_URLS_PER_SOURCE=25

# Maximum tokens per batch (default: 6000)
LLM_MAX_TOKENS=6000

# Maximum URLs per batch (default: 20)
LLM_MAX_BATCH_SIZE=20

# Minimum URLs per batch (default: 5)
LLM_MIN_BATCH_SIZE=5

# Enable debug logging for batch calculations (default: false)
DEBUG_BATCHING=false
```

### Example Batching Output

```
📦 Processing 46 URLs in 4 batches of ~12
🔄 Processing batch 1/4 (12 URLs, ~1200 tokens)
✅ Batch 1: 8/10 articles valid
🔄 Processing batch 2/4 (12 URLs, ~1200 tokens)
✅ Batch 2: 6/9 articles valid
...
📊 Batching Summary: Processed 46 URLs in approximately 4 batches to avoid token limits
```

For detailed batching configuration options, see [BATCHING_CONFIG.md](./BATCHING_CONFIG.md).

## Deployment

### 1. Deploy via Appwrite Console

1. Go to your Appwrite Console
2. Navigate to **Functions**
3. Click **Create Function**
4. Fill in the details:
   - **Name**: `scout`
   - **Runtime**: `Node.js 18`
   - **Entrypoint**: `index.js`
5. Upload the function files
6. Set build command: `npm install`
7. Deploy the function

### 2. Configure Function Settings

#### Scopes
Configure the scopes your function needs:
- Navigate to **Settings** > **Scopes**
- Select: `databases.read`, `databases.write`, `users.read`

#### Environment Variables
Add all required environment variables in **Settings** > **Environment Variables**

#### Triggers
Configure how the function is invoked:
- **HTTP**: For manual invocation or webhook calls
- **Schedule**: For recurring tasks (recommended: every 6-12 hours)
- **Event**: For Appwrite events

### 3. Recommended Schedule

Set up a cron schedule to run every 6-12 hours:
```bash
# Run every 6 hours
0 */6 * * *

# Run every 12 hours
0 */12 * * *
```

## Function Execution

### Manual Execution
```bash
# Test the function manually
curl -X POST "https://your-appwrite-instance/v1/functions/YOUR_FUNCTION_ID/executions" \
  -H "X-Appwrite-Project: YOUR_PROJECT_ID" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Scheduled Execution
The function will automatically run based on your configured schedule.

## Output

The function returns a JSON response with:
```json
{
  "success": true,
  "articlesFound": 25,
  "articlesSelected": 10,
  "articlesAdded": 8,
  "duplicatesSkipped": 2,
  "errors": [],
  "executionTime": "45.2s"
}
```

## Monitoring

- Check function logs in the **Executions** tab
- Monitor articles added to your database
- Track execution time and success rates
- Set up alerts for function failures

## Customization

### Adding New Websites

To add new websites to scout, modify the `TARGET_WEBSITES` array in `index.js`:

```javascript
const TARGET_WEBSITES = [
  // ... existing websites
  {
    name: "New Tech Site",
    url: "https://newtechsite.com",
    selectors: {
      articleLinks: "a[href*='/article/']",
      title: "h1, h2",
      description: ".description, .excerpt",
      content: ".content, .article-body"
    }
  }
];
```

### Adjusting Quality Thresholds

Modify the AI analysis prompts and scoring thresholds to match your content standards.

## Troubleshooting

### Common Issues

1. **Rate Limiting**: Some websites may block rapid requests
   - Solution: Increase `SCRAPING_DELAY_MS` between requests

2. **Content Blocking**: Some sites may block automated access
   - Solution: Use different user agents or implement proxy rotation

3. **AI Analysis Failures**: OpenAI API errors
   - Solution: Check API key validity and rate limits

4. **Token Limit Errors**: LLM requests exceeding token limits
   - Solution: The function now automatically batches URLs to avoid this issue
   - If still occurring, reduce `LLM_MAX_TOKENS` or `LLM_MAX_BATCH_SIZE`

5. **Database Errors**: Appwrite connection issues
   - Solution: Verify database IDs and API key permissions

### Logs

Check function execution logs for detailed error information and debugging.

## Security Considerations

- The scout function runs with elevated database permissions
- Ensure the scout user account has minimal necessary permissions
- Monitor function executions for unusual activity
- Regularly rotate API keys

## Performance

- Typical execution time: 30-60 seconds
- Memory usage: ~100-200MB
- Network requests: 50-100 per execution
- Database operations: 10-20 per execution

## Next Steps

After deploying the scout function:
1. Test with manual execution
2. Set up scheduled execution
3. Monitor article quality and relevance
4. Adjust AI prompts and thresholds as needed
5. Add more target websites based on your needs
