# Algorithm Function

## Overview

The Algorithm Function is responsible for calculating ranking scores for posts based on multiple factors. It processes all posts that have `enhanced=true` and `timeScore > 0` from the last 24 hours, gradually reducing their time factor scores and calculating a final ranking score.

## Purpose

This function implements a sophisticated ranking algorithm that considers multiple factors to determine the quality and relevance of posts. The algorithm is designed to be:

- **Transparent**: All scoring rules are clearly defined and documented
- **Maintainable**: Well-organized code structure for easy updates
- **Fair**: Consistent scoring across all posts
- **Efficient**: Batch processing with proper pagination

## How It Works

### 1. Time Score Decay
- New posts start with a `timeScore` of 100
- Over 24 hours, the score gradually decreases to 0
- This ensures newer content gets higher visibility initially

### 2. Multi-Factor Scoring
The algorithm evaluates posts based on several quality metrics:

- **Spelling Score** (0-100): Grammar and spelling quality
- **Spam Score** (0-100): Content legitimacy (inverted - lower is better)
- **Safety Score** (0-100): Content appropriateness
- **Quality Score** (0-100): Overall content value and relevance

### 3. Weighted Scoring System
Each factor has a configurable weight that contributes to the final score:

```javascript
const SCORING_WEIGHTS = {
  timeScore: 0.35,      // 35% - Time relevance
  spellingScore: 0.15,  // 15% - Writing quality
  spamScore: 0.25,      // 25% - Content legitimacy
  safetyScore: 0.10,    // 10% - Safety
  qualityScore: 0.15    // 15% - Overall quality
};
```

### 4. Final Score Calculation
The final score is calculated using a weighted average formula:

```
finalScore = (timeScore × 0.35) + (spellingScore × 0.15) + 
             ((100 - spamScore) × 0.25) + (safetyScore × 0.10) + 
             (qualityScore × 0.15)
```

Note: Spam score is inverted (100 - spamScore) so that lower spam scores result in higher final scores.

## Configuration

### Environment Variables
- `NEXT_PUBLIC_APPWRITE_ENDPOINT`: Appwrite endpoint URL
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID`: Appwrite project ID
- `APPWRITE_API_KEY`: Appwrite API key
- `APPWRITE_DATABASE_ID`: Database ID
- `APPWRITE_POSTS_COLLECTION_ID`: Posts collection ID

### Scoring Weights
The scoring weights can be easily modified in the `SCORING_WEIGHTS` constant to adjust the algorithm's behavior.

## Processing Logic

### 1. Query Posts
- Fetches posts with `enhanced=true` and `timeScore > 0`
- Filters for posts from the last 24 hours
- Processes posts in batches for efficiency

### 2. Calculate Time Decay
- Determines hours since post creation
- Applies exponential decay formula for smooth score reduction
- Ensures scores reach 0 at exactly 16 hours

### 3. Apply Scoring Rules
- Each quality metric is normalized to 0-100 scale
- Weights are applied according to the scoring configuration
- Final score is calculated and rounded to 2 decimal places

### 4. Batch Update
- Uses Appwrite's batch update functionality with 1000 posts per batch
- Implements cursor pagination for efficient reading of large datasets
- Processes updates in configurable batch sizes for optimal performance

## Output

The function updates each post with:
- `timeScore`: New calculated time score (0-100)
- `score`: Final ranking score (0-100)
- `lastScored`: Timestamp of last scoring update

## Monitoring

The function provides comprehensive logging:
- Processing progress and statistics
- Error handling and reporting
- Performance metrics
- Summary of processed posts

## Maintenance

### Adding New Scoring Factors
1. Add the new factor to the `SCORING_WEIGHTS` object
2. Update the `calculateFinalScore` function
3. Ensure the factor is available in the post data
4. Update documentation

### Modifying Weights
Simply adjust the values in `SCORING_WEIGHTS` to change the algorithm's behavior.

### Performance Optimization
- Uses cursor pagination for efficient reading of large datasets
- Batch size of 1000 for optimal Appwrite performance
- Processing delays can be modified for rate limiting
- Query filters optimized for enhanced posts with time scores

## Open Source Considerations

This algorithm is designed to be open source friendly:
- Clear, readable code structure
- Comprehensive documentation
- Configurable parameters
- Transparent scoring logic
- Easy to understand and modify

## Future Enhancements

Potential improvements could include:
- Machine learning-based weight optimization
- User engagement metrics integration
- A/B testing framework for algorithm variations
- Real-time scoring updates
- Custom scoring rules per category or user preferences
