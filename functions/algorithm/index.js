/**
 * Algorithm Appwrite Function
 * 
 * This function calculates ranking scores for posts based on multiple factors:
 * - Time decay (posts lose relevance over 24 hours)
 * - Quality metrics (spelling, spam, safety, quality scores)
 * - Weighted scoring system for fair ranking
 * 
 * The algorithm processes posts in batches and updates them efficiently using
 * Appwrite's batch update functionality.
 */

import { Client, Databases, Query } from 'node-appwrite';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Scoring weights for different factors
 * These weights determine how much each factor contributes to the final score
 * Total should equal 1.0 (100%)
 */
const SCORING_WEIGHTS = {
  timeScore: 0.25,      // 25% - Time relevance (newer posts get higher scores)
  spellingScore: 0.05,  // 5% - Writing quality and grammar
  spamScore: 0.10,      // 10% - Content legitimacy (inverted - lower spam = higher score)
  safetyScore: 0.10,    // 10% - Content appropriateness and safety
  qualityScore: 0.25,   // 25% - Overall content value and relevance
  voteCount: 0.15,      // 15% - Community engagement through voting
  commentCount: 0.10    // 10% - Community discussion and engagement
};

/**
 * Processing configuration
 */
const PROCESSING_CONFIG = {
  batchSize: 1000,          // Number of posts to process in each batch (read and write)
  maxProcessingTime: 900000, // Maximum processing time in milliseconds (15 minutes)
  rateLimitDelay: 100,       // Delay between batches to avoid rate limiting
  timeScoreDecayHours: 24    // Hours over which time score decays to 0
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export default async function ({ req, res, log, error }) {
  const startTime = Date.now();
  
  try {
    log('🚀 Algorithm function started - Calculating post ranking scores');
    
    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '')
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
      .setKey(process.env.APPWRITE_API_KEY || '');
    
    const databases = new Databases(client);
    
    // Database and collection IDs
    const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '';
    const COLLECTION_ID = process.env.APPWRITE_POSTS_COLLECTION_ID || '';
    
    if (!DATABASE_ID || !COLLECTION_ID) {
      throw new Error('Missing database or collection ID in environment variables');
    }
    
    // Get posts to process
    const posts = await fetchPostsToProcess(databases, DATABASE_ID, COLLECTION_ID, log);
    
    if (posts.length === 0) {
      log('ℹ️ No posts found to process. All posts may already be processed or outside the 24-hour window.');
      return res.json({
        message: 'No posts to process',
        status: 'success',
        timestamp: new Date().toISOString(),
        summary: { totalPosts: 0, processed: 0, updated: 0, errors: 0 }
      });
    }
    
    log(`📊 Found ${posts.length} posts to process`);
    
    // Process posts and calculate scores
    const processingResults = await processPostsInBatches(
      posts, 
      databases, 
      DATABASE_ID, 
      COLLECTION_ID, 
      log,
      error
    );
    
    // Generate final summary
    const result = generateFinalSummary(processingResults, startTime, log);
    
    return res.json(result);
    
  } catch (err) {
    error(`❌ Error in Algorithm function: ${err.message}`);
    return res.json({
      message: 'Error occurred in algorithm function',
      error: err.message,
      status: 'error',
      timestamp: new Date().toISOString()
    }, 500);
  }
}

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Fetch posts that need to be processed by the algorithm using cursor pagination
 * This handles large datasets efficiently by processing in batches of 1000
 */
async function fetchPostsToProcess(databases, databaseId, collectionId, log) {
  try {
    log('🔍 Fetching posts for algorithm processing using cursor pagination...');
    
    // Calculate the timestamp for 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - (24 * 60 * 60 * 1000));
    
    const allPosts = [];
    let cursor = null;
    let totalFetched = 0;
    let postsResponse;
    let posts;
    
    do {
      // Build query with cursor pagination
      const queries = [
        Query.equal('enhanced', true),
        Query.greaterThan('timeScore', 0),
        Query.greaterThan('$createdAt', twentyFourHoursAgo.toISOString()),
        Query.orderDesc('$createdAt'), // Process newest posts first
        Query.limit(PROCESSING_CONFIG.batchSize) // Fetch 1000 posts per batch
      ];
      
      // Add cursor for pagination (skip first iteration)
      if (cursor) {
        queries.push(Query.cursorAfter(cursor));
      }
      
      postsResponse = await databases.listDocuments(
        databaseId,
        collectionId,
        queries
      );
      
      posts = postsResponse.documents;
      allPosts.push(...posts);
      totalFetched += posts.length;
      
      // Get cursor for next page (last document ID)
      cursor = posts.length > 0 ? posts[posts.length - 1].$id : null;
      
      log(`📄 Fetched batch: ${posts.length} posts (Total: ${totalFetched})`);
      
      // Add small delay between pagination requests to avoid rate limiting
      if (cursor) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
    } while (cursor && posts.length === PROCESSING_CONFIG.batchSize);
    
    log(`✅ Successfully fetched ${allPosts.length} posts using cursor pagination`);
    return allPosts;
    
  } catch (err) {
    throw new Error(`Failed to fetch posts: ${err.message}`);
  }
}

// ============================================================================
// SCORING ALGORITHM
// ============================================================================

/**
 * Calculate the time decay score for a post
 * New posts start with 100, old posts (23-24 hours) get 0
 */
function calculateTimeDecayScore(createdAt, currentTimeScore) {
  const now = new Date();
  const created = new Date(createdAt);
  const hoursSinceCreation = (now - created) / (1000 * 60 * 60);
  
  // If post is older than 24 hours, time score should be 0
  if (hoursSinceCreation >= PROCESSING_CONFIG.timeScoreDecayHours) {
    return 0;
  }
  
  // Calculate decay using exponential decay formula for smooth reduction
  // This ensures newer posts get higher scores and older posts get lower scores
  const decayRate = 0.1; // Controls how quickly the score decays
  const newTimeScore = currentTimeScore * Math.exp(-decayRate * hoursSinceCreation);
  
  // Ensure the score is within 0-100 range and convert to integer
  return Math.max(0, Math.min(100, Math.round(newTimeScore)));
}

/**
 * Calculate the final ranking score based on all factors
 */
function calculateFinalScore(post, newTimeScore) {
  try {
    // Use default scores for missing metrics
    const spellingScore = post.spellingScore ?? 50;    // Neutral score if missing
    const spamScore = post.spamScore ?? 50;            // Neutral score if missing
    const safetyScore = post.safetyScore ?? 75;        // Assume safe if missing
    const qualityScore = post.qualityScore ?? 50;      // Neutral score if missing
    
    // Get vote count and comment count with defaults
    const voteCount = post.count ?? 0;                 // Vote count, default to 0
    const commentCount = post.countComments ?? 0;      // Comment count, default to 0
    
    // Calculate weighted components
    const timeScoreComponent = newTimeScore * SCORING_WEIGHTS.timeScore;
    const spellingScoreComponent = spellingScore * SCORING_WEIGHTS.spellingScore;
    
    // Invert spam score so that lower spam = higher score
    const spamScoreComponent = (100 - spamScore) * SCORING_WEIGHTS.spamScore;
    
    const safetyScoreComponent = safetyScore * SCORING_WEIGHTS.safetyScore;
    const qualityScoreComponent = qualityScore * SCORING_WEIGHTS.qualityScore;
    
    // Calculate vote count score (0-100 scale)
    // Apply logarithmic scaling to prevent extremely high vote counts from dominating
    const voteCountScore = Math.min(100, Math.round(Math.log10(Math.max(1, voteCount + 1)) * 20));
    const voteCountComponent = voteCountScore * SCORING_WEIGHTS.voteCount;
    
    // Calculate comment count score (0-100 scale)
    // Apply logarithmic scaling to prevent extremely high comment counts from dominating
    const commentCountScore = Math.min(100, Math.round(Math.log10(Math.max(1, commentCount + 1)) * 25));
    const commentCountComponent = commentCountScore * SCORING_WEIGHTS.commentCount;
    
    // Calculate weighted sum
    const finalScore = timeScoreComponent + 
                      spellingScoreComponent + 
                      spamScoreComponent + 
                      safetyScoreComponent + 
                      qualityScoreComponent +
                      voteCountComponent +
                      commentCountComponent;
    
    // Ensure score is within 0-100 range and convert to integer
    return Math.max(0, Math.min(100, Math.round(finalScore)));
    
  } catch (err) {
    // Silently handle calculation errors and return 0
    // This prevents the entire algorithm from failing due to a single post scoring issue
    return 0; // Return 0 if calculation fails
  }
}

/**
 * Apply scoring algorithm to a single post
 */
function applyScoringAlgorithm(post) {
  // Calculate new time score based on decay
  const newTimeScore = calculateTimeDecayScore(post.$createdAt, post.timeScore || 100);
  
  // Calculate final ranking score
  const finalScore = calculateFinalScore(post, newTimeScore);
  
  // Return updated data for batch update
  return {
    timeScore: newTimeScore,
    score: finalScore
  };
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Process posts in batches for efficient database updates
 * Uses Appwrite's batch update with 1000 posts per batch
 */
async function processPostsInBatches(posts, databases, databaseId, collectionId, log, error) {
  const results = {
    totalPosts: posts.length,
    processed: 0,
    updated: 0,
    errors: 0,
    batches: 0
  };
  
  // Process posts in batches of 1000
  for (let i = 0; i < posts.length; i += PROCESSING_CONFIG.batchSize) {
    const batchStart = i;
    const batchEnd = Math.min(i + PROCESSING_CONFIG.batchSize, posts.length);
    const batch = posts.slice(batchStart, batchEnd);
    
    results.batches++;
    log(`📦 Processing batch ${results.batches}: posts ${batchStart + 1}-${batchEnd} of ${posts.length}`);
    
    try {
      // Apply scoring algorithm to all posts in the batch
      // Create batch updates with only the fields we want to update
      const batchUpdates = batch.map(post => {
        const updatedData = applyScoringAlgorithm(post);
        return {
          $id: post.$id,
          timeScore: updatedData.timeScore,
          score: updatedData.score
        };
      });
      
      // Log the structure of the first batch update for debugging
      if (results.batches === 1) {
        log(`🔍 First batch update structure: ${JSON.stringify(batchUpdates[0])}`);
        
        // Log sample scoring details for the first post
        const firstPost = batch[0];
        const voteCount = firstPost.count ?? 0;
        const commentCount = firstPost.countComments ?? 0;
        log(`📊 Sample post scoring - Votes: ${voteCount}, Comments: ${commentCount}, Final Score: ${batchUpdates[0].score}`);
      }
      
      // Update batch using Appwrite's bulk operations
      // Use individual document updates for reliability
      // Process each document update individually using updateDocument
      let successfulUpdates = 0;
      for (const update of batchUpdates) {
        try {
          await databases.updateDocument(
            databaseId,
            collectionId,
            update.$id,
            {
              timeScore: update.timeScore,
              score: update.score
            }
          );
          successfulUpdates++;
        } catch (updateError) {
          log(`⚠️ Failed to update document ${update.$id}: ${updateError.message}`);
          results.errors++;
        }
      }
      
      results.updated += successfulUpdates;
      results.processed += batch.length;
      
      log(`✅ Batch ${results.batches} completed: ${successfulUpdates}/${batch.length} posts updated successfully`);
      
      // Add delay between batches to avoid rate limiting
      if (batchEnd < posts.length) {
        await new Promise(resolve => setTimeout(resolve, PROCESSING_CONFIG.rateLimitDelay));
      }
      
    } catch (batchError) {
      error(`❌ Error processing batch ${results.batches}: ${batchError.message}`);
      results.errors += batch.length;
      
      // Continue with next batch instead of failing completely
      log(`⚠️ Continuing with next batch despite errors in batch ${results.batches}`);
    }
  }
  
  return results;
}

// ============================================================================
// UTILITIES AND HELPERS
// ============================================================================

/**
 * Generate comprehensive final summary of the algorithm execution
 */
function generateFinalSummary(results, startTime, log) {
  const endTime = Date.now();
  const processingTime = endTime - startTime;
  const successRate = results.totalPosts > 0 ? Math.round((results.updated / results.totalPosts) * 100) : 0;
  
  // Log comprehensive summary
  log('🎯 ALGORITHM FUNCTION COMPLETED');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(`📊 Total posts found: ${results.totalPosts}`);
  log(`✅ Successfully processed: ${results.updated}`);
  log(`❌ Errors encountered: ${results.errors}`);
  log(`📈 Success rate: ${successRate}%`);
  log(`📦 Batches processed: ${results.batches}`);
  log(`⏱️  Total processing time: ${processingTime}ms`);
  log(`⚖️  Scoring weights used:`);
  Object.entries(SCORING_WEIGHTS).forEach(([factor, weight]) => {
    log(`   • ${factor}: ${(weight * 100).toFixed(0)}%`);
  });
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Performance warnings
  if (processingTime > PROCESSING_CONFIG.maxProcessingTime) {
    log(`⚠️  Processing time (${processingTime}ms) exceeded recommended limit (${PROCESSING_CONFIG.maxProcessingTime}ms)`);
  }
  
  if (results.errors > 0) {
    log(`⚠️  ${results.errors} posts failed to process. Check error logs for details.`);
  }
  
  if (results.updated === 0) {
    log('ℹ️  No posts were updated. This might indicate an issue with the scoring algorithm or database permissions.');
  }
  
  return {
    message: 'Algorithm processing completed',
    status: 'success',
    timestamp: new Date().toISOString(),
    processingTime: `${processingTime}ms`,
    summary: {
      totalPosts: results.totalPosts,
      processed: results.processed,
      updated: results.updated,
      errors: results.errors,
      batches: results.batches,
      successRate: `${successRate}%`
    },
    algorithm: {
      weights: SCORING_WEIGHTS,
      timeDecayHours: PROCESSING_CONFIG.timeScoreDecayHours,
      batchSize: PROCESSING_CONFIG.batchSize
    }
  };
}

/**
 * Validate that all scoring weights sum to 1.0 (100%)
 * This is a safety check to ensure the algorithm is properly configured
 */
function validateScoringWeights() {
  const totalWeight = Object.values(SCORING_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  if (Math.abs(totalWeight - 1.0) > 0.001) {
    throw new Error(`Scoring weights must sum to 1.0, current sum: ${totalWeight}`);
  }
}

// Validate weights on module load
validateScoringWeights();
