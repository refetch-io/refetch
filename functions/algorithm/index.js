/**
 * Algorithm Appwrite Function
 * 
 * This function calculates ranking scores for posts based on multiple factors:
 * - Tech relevancy (highest priority - ensures content is relevant for tech audience)
 * - Time decay (posts lose relevance over 16 hours)
 * - Quality metrics (spelling, spam, safety, quality scores)
 * - Sensation score for dramatic tech news (0-100 scale)
 * - Weighted scoring system for fair ranking
 * 
 * The algorithm processes posts in batches and updates them efficiently using
 * Appwrite's batch update functionality.
 * 
 * SCORING WEIGHTS (Percentage Importance):
 * - Relevancy Score: 25% - Tech audience relevance (HIGHEST PRIORITY)
 * - Diversity Score: 15% - Domain diversity (prevents single domain domination)
 * - Sensation Score: 15% - Dramatic tech news impact
 * - Quality Score: 10% - Overall content value and relevance
 * - Time Score: 8% - Time relevance (medium weight)
 * - Vote Count: 12% - Community engagement through voting (high weight)
 * - Safety Score: 6% - Content appropriateness and safety (medium weight)
 * - Comment Count: 6% - Community discussion and engagement (high weight)
 * - Spelling Score: 2% - Writing quality and grammar (low weight)
 * - Spam Score: 1% - Content legitimacy (inverted - lower spam = higher score) (low weight)
 * 
 * Total Weight: 100% (1.0)
 *
 * SOURCE BALANCING (applied after the weighted sum, see source-balance.js):
 * - Diversity is computed per source (YouTube channel, otherwise domain) within the scoring window
 * - Sources with many posts in the window get compounding score multipliers
 * - Some sources carry a fixed quality weight (e.g. dev.to)
 * - Sources with a known audience (YouTube subscribers) get a log-scaled boost or penalty
 */

import { Client, TablesDB, Query } from 'node-appwrite';
import { balanceSources, AUDIENCE_CONFIG, SATURATION_CONFIG } from './source-balance.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Scoring weights for different factors
 * These weights determine how much each factor contributes to the final score
 * Each weight represents the percentage importance of that factor
 */
const SCORING_WEIGHTS = {
  relevancyScore: 0.25,   // 25% - Tech relevance (highest weight - most important factor)
  diversityScore: 0.15,   // 15% - Domain diversity (reduced to make room for relevancy)
  sensationScore: 0.15,   // 15% - Dramatic tech news impact (reduced)
  qualityScore: 0.10,     // 10% - Overall content value and relevance (reduced)
  timeScore: 0.08,        // 8% - Time relevance (reduced)
  voteCount: 0.12,        // 12% - Community engagement through voting (reduced)
  safetyScore: 0.06,      // 6% - Content appropriateness and safety (reduced)
  commentCount: 0.06,     // 6% - Community discussion and engagement (reduced)
  spellingScore: 0.02,    // 2% - Writing quality and grammar (reduced)
  spamScore: 0.01         // 1% - Content legitimacy (inverted - lower spam = higher score) (reduced)
};

/**
 * Processing configuration
 */
const PROCESSING_CONFIG = {
  batchSize: 1000,          // Number of posts to process in each batch (read and write)
  maxProcessingTime: 900000, // Maximum processing time in milliseconds (15 minutes)
  rateLimitDelay: 100,       // Delay between batches to avoid rate limiting
  timeScoreDecayHours: 16    // Hours over which time score decays to 0
};

/**
 * Sensation Score Guidelines for Dramatic Tech News (0-100 scale):
 * 
 * High Sensation (80-100): Industry-shifting announcements, major failures, 
 * security breaches, unexpected acquisitions, technological breakthroughs
 * 
 * Medium Sensation (40-79): Leadership changes, product updates, partnerships, 
 * regulatory developments, moderate controversies
 * 
 * Low Sensation (0-39): Routine updates, minor releases, incremental improvements, 
 * standard industry news
 */

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
    
    const tablesDB = new TablesDB(client);
    
    // Database and collection IDs
    const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '';
    const COLLECTION_ID = process.env.APPWRITE_POSTS_COLLECTION_ID || '';
    
    if (!DATABASE_ID || !COLLECTION_ID) {
      throw new Error('Missing database or collection ID in environment variables');
    }
    
    // Get posts to process
    const posts = await fetchPostsToProcess(tablesDB, DATABASE_ID, COLLECTION_ID, log);
    
    if (posts.length === 0) {
      log('ℹ️ No posts found to process. All posts may already be processed or outside the 16-hour window.');
      return res.json({
        message: 'No posts to process',
        status: 'success',
        timestamp: new Date().toISOString(),
        summary: { totalPosts: 0, processed: 0, updated: 0, errors: 0 }
      });
    }
    
    log(`📊 Found ${posts.length} posts to process`);

    // Balance sources across the scoring window (diversity + volume saturation)
    const sourceBalance = calculateSourceBalance(posts, log);

    // Process posts and calculate scores with source balancing applied
    const processingResults = await processPostsInBatches(
      posts,
      tablesDB,
      DATABASE_ID,
      COLLECTION_ID,
      log,
      error,
      sourceBalance
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
async function fetchPostsToProcess(tablesDB, databaseId, collectionId, log) {
  try {
    log('🔍 Fetching posts for algorithm processing using cursor pagination...');
    
    // Calculate the timestamp for 16 hours ago
    const sixteenHoursAgo = new Date(Date.now() - (16 * 60 * 60 * 1000));
    
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
        Query.greaterThan('$createdAt', sixteenHoursAgo.toISOString()),
        Query.orderDesc('$createdAt'), // Process newest posts first
        Query.limit(PROCESSING_CONFIG.batchSize) // Fetch 1000 posts per batch
      ];
      
      // Add cursor for pagination (skip first iteration)
      if (cursor) {
        queries.push(Query.cursorAfter(cursor));
      }
      
      postsResponse = await tablesDB.listRows(
        databaseId,
        collectionId,
        queries
      );
      
      posts = postsResponse.rows;
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
 * New posts start with 100, old posts (15-16 hours) get 0
 */
function calculateTimeDecayScore(createdAt, currentTimeScore) {
  const now = new Date();
  const created = new Date(createdAt);
  const hoursSinceCreation = (now - created) / (1000 * 60 * 60);
  
  // If post is older than 16 hours, time score should be 0
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
function calculateFinalScore(post, newTimeScore, diversityScore = 0) {
  try {
    // Use default scores for missing metrics
    const relevancyScore = post.relevancyScore ?? 50;   // Neutral score if missing
    const spellingScore = post.spellingScore ?? 50;    // Neutral score if missing
    const spamScore = post.spamScore ?? 50;            // Neutral score if missing
    const safetyScore = post.safetyScore ?? 75;        // Assume safe if missing
    const qualityScore = post.qualityScore ?? 50;      // Neutral score if missing
    const sensationScore = post.sensationScore ?? 0;   // Sensation score for dramatic tech news, default to 0
    
    // Get vote count and comment count with defaults
    const voteCount = post.count ?? 0;                 // Vote count, default to 0
    const commentCount = post.countComments ?? 0;      // Comment count, default to 0
    
    // Calculate weighted components
    const relevancyScoreComponent = relevancyScore * SCORING_WEIGHTS.relevancyScore;
    const timeScoreComponent = newTimeScore * SCORING_WEIGHTS.timeScore;
    const spellingScoreComponent = spellingScore * SCORING_WEIGHTS.spellingScore;
    
    // Invert spam score so that lower spam = higher score
    const spamScoreComponent = (100 - spamScore) * SCORING_WEIGHTS.spamScore;
    
    const safetyScoreComponent = safetyScore * SCORING_WEIGHTS.safetyScore;
    const qualityScoreComponent = qualityScore * SCORING_WEIGHTS.qualityScore;
    
    // Sensation score component - high weight for dramatic tech news
    const sensationScoreComponent = sensationScore * SCORING_WEIGHTS.sensationScore;
    
    // Diversity score component - high weight to prevent domain domination
    const diversityScoreComponent = diversityScore * SCORING_WEIGHTS.diversityScore;
    
    // Calculate vote count score (0-100 scale)
    // Apply logarithmic scaling to prevent extremely high vote counts from dominating
    const voteCountScore = Math.min(100, Math.round(Math.log10(Math.max(1, voteCount + 1)) * 20));
    const voteCountComponent = voteCountScore * SCORING_WEIGHTS.voteCount;
    
    // Calculate comment count score (0-100 scale)
    // Apply logarithmic scaling to prevent extremely high comment counts from dominating
    const commentCountScore = Math.min(100, Math.round(Math.log10(Math.max(1, commentCount + 1)) * 25));
    const commentCountComponent = commentCountScore * SCORING_WEIGHTS.commentCount;
    
    // Calculate weighted sum
    const finalScore = relevancyScoreComponent +
                      timeScoreComponent + 
                      spellingScoreComponent + 
                      spamScoreComponent + 
                      safetyScoreComponent + 
                      qualityScoreComponent +
                      sensationScoreComponent +
                      diversityScoreComponent +
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
 * Group the scoring window by domain and work out each post's diversity score
 * and source multiplier (see source-balance.js). Ranking inside a domain uses
 * the score without diversity, so the result doesn't depend on itself.
 */
function calculateSourceBalance(posts, log) {
  const balance = balanceSources(posts.map(post => ({
    id: post.$id,
    link: post.link,
    source: post.source,
    sourceFollowers: post.sourceFollowers,
    baseScore: calculateFinalScore(post, calculateTimeDecayScore(post.$createdAt, post.timeScore || 100))
  })));

  // Log the sources that are being held back the most
  const perSource = new Map();
  for (const { source, multiplier } of balance.values()) {
    if (!source) continue;
    const stats = perSource.get(source) ?? { count: 0, penalized: 0 };
    stats.count++;
    if (multiplier < 1) stats.penalized++;
    perSource.set(source, stats);
  }
  [...perSource.entries()]
    .filter(([, stats]) => stats.penalized > 0)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .forEach(([source, stats]) => {
      log(`🌐 Source ${source}: ${stats.count} posts in window, ${stats.penalized} penalized`);
    });

  return balance;
}

/**
 * Apply scoring algorithm to a single post
 */
function applyScoringAlgorithm(post, balance) {
  const diversityScore = balance?.diversityScore ?? 0;
  const multiplier = balance?.multiplier ?? 1;

  // Calculate new time score based on decay
  const newTimeScore = calculateTimeDecayScore(post.$createdAt, post.timeScore || 100);

  // Calculate final ranking score, then apply the source multiplier
  const unbalancedScore = calculateFinalScore(post, newTimeScore, diversityScore);
  const finalScore = Math.max(0, Math.min(100, Math.round(unbalancedScore * multiplier)));

  // Log scoring details for debugging (only for first few posts to avoid spam)
  if (Math.random() < 0.1) { // Log ~10% of posts for debugging
    console.log(`🔍 Post scoring debug - ID: ${post.$id}, Title: "${post.title?.substring(0, 50)}..."`);
    console.log(`   Relevancy Score: ${post.relevancyScore || 50} (Weight: ${(SCORING_WEIGHTS.relevancyScore * 100).toFixed(0)}%)`);
    console.log(`   Time Score: ${post.timeScore || 100} → ${newTimeScore}`);
    console.log(`   Diversity Score: ${diversityScore}`);
    console.log(`   Source: ${balance?.source ?? 'unknown'} #${(balance?.rank ?? 0) + 1}, followers ${post.sourceFollowers ?? 'n/a'}, multiplier ${multiplier.toFixed(2)}`);
    console.log(`   Final Score: ${unbalancedScore} → ${finalScore}`);
  }
  
  // Return updated data for batch update
  return {
    timeScore: newTimeScore,
    score: finalScore,
    diversityScore: diversityScore
  };
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Process posts in batches for efficient database updates
 * Uses Appwrite's batch update with 1000 posts per batch
 */
async function processPostsInBatches(posts, tablesDB, databaseId, collectionId, log, error, sourceBalance) {
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
        const updatedData = applyScoringAlgorithm(post, sourceBalance.get(post.$id));

        return {
          $id: post.$id,
          timeScore: updatedData.timeScore,
          score: updatedData.score,
          diversityScore: updatedData.diversityScore
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
      // Process each row update individually using updateRow
      let successfulUpdates = 0;
      for (const update of batchUpdates) {
        try {
          await tablesDB.updateRow(
            databaseId,
            collectionId,
            update.$id,
            {
              timeScore: update.timeScore,
              score: update.score,
              diversityScore: update.diversityScore
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
      
      // Log score distribution for this batch
      const scores = batchUpdates.map(update => update.score);
      const batchDiversityScores = batchUpdates.map(update => update.diversityScore);
      const avgScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);
      const avgDiversity = Math.round(batchDiversityScores.reduce((sum, score) => sum + score, 0) / batchDiversityScores.length);
      const diversity100Count = batchDiversityScores.filter(score => score === 100).length;
      log(`✅ Batch ${results.batches} completed: ${successfulUpdates}/${batch.length} posts updated successfully`);
      log(`📊 Score distribution - Avg: ${avgScore}, Min: ${minScore}, Max: ${maxScore}`);
      log(`🌐 Diversity distribution - Avg: ${avgDiversity}, Posts with 100: ${diversity100Count}/${batch.length}`);
      
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
        log(`🌐 Source balancing: ${SATURATION_CONFIG.freePerDomain} free posts per source, then ×${SATURATION_CONFIG.decay} each (floor ${SATURATION_CONFIG.floor})`);
        log(`📺 Audience: ×${AUDIENCE_CONFIG.perDecade} per 10× followers around ${AUDIENCE_CONFIG.pivot} (${AUDIENCE_CONFIG.min}-${AUDIENCE_CONFIG.max})`);
        log(`⚖️  Scoring weights used (Percentage Importance):`);
        log(`   🎯 Relevancy Score: ${(SCORING_WEIGHTS.relevancyScore * 100).toFixed(0)}% (Tech audience relevance - HIGHEST PRIORITY)`);
        Object.entries(SCORING_WEIGHTS).forEach(([factor, weight]) => {
          if (factor !== 'relevancyScore') { // Skip relevancy as it's already logged above
            log(`   • ${factor}: ${(weight * 100).toFixed(0)}%`);
          }
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
      saturation: SATURATION_CONFIG,
      audience: AUDIENCE_CONFIG,
      timeDecayHours: PROCESSING_CONFIG.timeScoreDecayHours,
      batchSize: PROCESSING_CONFIG.batchSize
    }
  };
}

/**
 * Note: Scoring weights no longer need to sum to 1.0 (100%)
 * Each weight represents the percentage importance of that factor
 * The algorithm will use the actual weight values for scoring calculations
 */
