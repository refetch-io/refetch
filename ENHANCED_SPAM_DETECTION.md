# Enhanced Spam Detection System

## Overview

The Refetch platform now includes an enhanced AI-powered spam detection system that automatically identifies and flags low-quality content that adds zero value to the platform. This system is designed to catch posts like "test 2" that are clearly testing the system or provide no meaningful content.

## How It Works

### 1. AI Analysis
The enhancement function uses OpenAI's GPT models to analyze each post submission and assign scores across multiple dimensions:

- **Spam Score (0-100)**: 0 = legitimate content, 100 = obvious spam
- **Quality Score (0-100)**: 0 = low impact/quality, 100 = high impact/exceptional quality
- **Safety Score (0-100)**: 0 = unsafe/inappropriate, 100 = completely safe
- **Spelling Score (0-100)**: 0 = many errors, 100 = perfect spelling

### 2. Enhanced Spam Detection Rules

The AI system is now trained to be extremely strict about identifying low-quality content:

#### URL Error Detection
The system now automatically detects and flags posts with broken or problematic URLs:
- **404 Errors**: Page not found - links to non-existent content
- **403 Errors**: Forbidden access - suspicious or restricted content
- **500+ Errors**: Server errors - website technical issues
- **Connection Failures**: Timeouts, network errors, or unreachable sites
- **Malicious URLs**: Links that fail to load or return suspicious errors

Posts with URL errors receive higher spam scores (70-90) as they:
- Provide no value to users (content cannot be accessed)
- May be phishing attempts or malicious links
- Indicate low-quality submissions or broken bookmarks
- Waste users' time with non-functional links

#### High Spam Indicators (Score 90-100):
- Posts with minimal content like "test", "test 2", "hello", "checking"
- Posts with no meaningful description or just placeholder text
- Posts that are clearly testing the system
- Posts with no tech relevance
- Posts that appear to be automated testing or bot-generated

#### Medium-High Spam Indicators (Score 70-90):
- Posts with broken URLs (404, 403, 500 errors, connection failures)
- Posts linking to non-existent pages or returning HTTP errors
- Posts with URLs that fail to load or return error pages
- Posts that promise content but deliver broken links

#### Low Quality Indicators (Score 0-20):
- Posts with no substantial content
- Just test messages or placeholder text
- No tech news, analysis, or meaningful information
- Content that doesn't fulfill the platform's purpose

### 3. Automatic Flagging

Posts are automatically flagged when:
- `spamScore >= 90` (High spam)
- `qualityScore <= 20` (Low quality)

Flagged posts receive:
- `flagged: true` attribute
- `flaggedReason` explaining why it was flagged
- Special logging with 🚨 and ⚠️ indicators

## Examples

### Example 1: "test 2" Post Analysis

The post you referenced (https://refetch.io/threads/689b76f60020f65eb3b8) would now be detected as:

```
🚨 HIGH SPAM DETECTED!
   Reasons:
   • Post title 'test 2' is clearly testing the system
   • No meaningful description provided
   • Content adds zero value to the tech platform
   • Appears to be automated testing or placeholder content
   • Extremely short title with no substantial information

⚠️  LOW QUALITY CONTENT DETECTED!
   Reasons:
   • No substantial content provided
   • Title is just a test message
   • No tech news, analysis, or meaningful information
   • Does not fulfill the platform's purpose of sharing valuable tech content

📋 RECOMMENDED ACTIONS:
   • IMMEDIATE REMOVAL - This is clearly spam/testing content
   • Add to moderation queue for human review
```

### Example 2: Broken URL Post Analysis

A post with a broken URL would be detected as:

```
🚨 MEDIUM-HIGH SPAM DETECTED!
   Reasons:
   • URL failed to load - may be broken or malicious
   • Post links to non-existent or inaccessible content
   • Users cannot access the promised content
   • May be a phishing attempt or broken link

⚠️  LOW QUALITY CONTENT DETECTED!
   Reasons:
   • Content cannot be accessed by users
   • Broken link provides no value to the community
   • Post promises content that cannot be delivered

📋 RECOMMENDED ACTIONS:
   • FLAG FOR MANUAL REVIEW - High likelihood of broken/malicious link
   • Consider removal if URL cannot be fixed
   • Add to moderation queue for human review
```

```
🚨 HIGH SPAM DETECTED!
   Reasons:
   • Post title 'test 2' is clearly testing the system
   • No meaningful description provided
   • Content adds zero value to the tech platform
   • Appears to be automated testing or placeholder content
   • Extremely short title with no substantial information

⚠️  LOW QUALITY CONTENT DETECTED!
   Reasons:
   • No substantial content provided
   • Title is just a test message
   • No tech news, analysis, or meaningful information
   • Does not fulfill the platform's purpose of sharing valuable tech content

📋 RECOMMENDED ACTIONS:
   • IMMEDIATE REMOVAL - This is clearly spam/testing content
   • Add to moderation queue for human review
```

## Implementation Details

### Code Consolidation

**Before**: The system prompt was duplicated in two files:
- `functions/enhancement/index.js` - Working implementation
- `lib/openai.ts` - Unused class with duplicate prompt

**After**: Consolidated to a single, maintainable structure:
- `lib/prompts.ts` - Centralized prompt configuration
- `functions/enhancement/index.js` - Uses shared prompt
- `lib/openai.ts` - Deleted (was unused)

This eliminates duplication, ensures consistency, and makes maintenance easier.

### Files Modified

1. **`functions/enhancement/index.js`**
   - Enhanced system prompt with strict spam detection rules
   - Automatic flagging of high-spam/low-quality posts
   - Detailed logging of flagged content
   - Counter tracking for flagged posts

2. **`lib/prompts.ts`** (NEW)
   - Centralized system prompt configuration
   - Eliminates duplication across the codebase
   - Single source of truth for AI analysis rules

### New Database Fields

Flagged posts now include:
- `flagged`: Boolean indicating if post was flagged
- `flaggedReason`: String explaining why it was flagged

### URL Error Detection

The system now automatically:
- Detects HTTP error codes (404, 403, 500+, etc.)
- Identifies connection failures and timeouts
- Flags posts with broken or suspicious URLs
- Provides detailed error analysis for spam detection
- Distinguishes between temporary server issues and broken links

### Enhanced Logging

The system now provides comprehensive logging:
```
🚨 Posts flagged for review: 1 (1 high spam, 1 low quality)
🚨 ATTENTION: 1 posts were flagged for review due to high spam scores or low quality content.
   High spam posts: 1 - These should be reviewed and potentially removed.
   Low quality posts: 1 - These may need improvement or removal.
```

## Benefits

1. **Automatic Detection**: No manual review needed for obvious spam
2. **Consistent Standards**: AI applies the same criteria to all posts
3. **Detailed Analysis**: Provides specific reasons why content was flagged
4. **Moderation Queue**: Flagged posts can be easily identified for human review
5. **Platform Quality**: Maintains high standards for content quality

## Future Enhancements

1. **Automatic Removal**: Posts with spam scores ≥95 could be automatically removed
2. **User Notifications**: Inform users when their posts are flagged
3. **Appeal System**: Allow users to appeal flagged posts
4. **Machine Learning**: Improve detection accuracy over time based on moderator decisions
5. **Rate Limiting**: Prevent users from submitting multiple low-quality posts

## Testing

You can test the enhanced spam detection by running:
```bash
node test-spam-detection.js
```

This will simulate how the system would analyze the "test 2" post and demonstrate the detection capabilities.

## Conclusion

The enhanced spam detection system significantly improves the platform's ability to maintain content quality by automatically identifying and flagging posts that add no value. This ensures that Refetch remains a high-quality source of tech news and information, free from testing posts and low-quality content.
