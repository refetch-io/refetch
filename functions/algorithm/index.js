/**
 * Algorithm Appwrite Function
 * 
 * This function calculates ranking scores for posts based on multiple factors:
 * - Tech relevancy (highest priority - ensures content is relevant for tech audience)
 * - Time decay (posts lose relevance over 24 hours)
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
 */

import { Client, Databases, Query } from 'node-appwrite';

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
  timeScoreDecayHours: 24    // Hours over which time score decays to 0
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
    
    // Calculate diversity scores for top 100 articles first
    let diversityScores;
    try {
      log('🌐 Starting diversity score calculation...');
      diversityScores = await calculateDiversityScores(databases, DATABASE_ID, COLLECTION_ID, log);
      log(`✅ Diversity scores calculated successfully for ${diversityScores.size} articles`);
      
      // Log some sample diversity scores for debugging
      let sampleCount = 0;
      for (const [postId, score] of diversityScores) {
        if (sampleCount < 5) {
          log(`   Sample: Post ${postId} → Diversity Score: ${score}`);
          sampleCount++;
        }
      }
      
    } catch (diversityError) {
      log(`⚠️ Warning: Failed to calculate diversity scores: ${diversityError.message}`);
      log(`   Error stack: ${diversityError.stack}`);
      log(`   Continuing with default diversity scores (all posts get 0)`);
      diversityScores = new Map(); // Empty map means all posts get 0 diversity score
    }
    
    // Ensure diversityScores is properly initialized
    if (!diversityScores || !(diversityScores instanceof Map)) {
      log(`⚠️ Warning: diversityScores is not a valid Map, creating empty Map`);
      diversityScores = new Map();
    }
    
    log(`🔍 Final diversityScores size: ${diversityScores.size}, type: ${typeof diversityScores}`);
    
    // Process posts and calculate scores with diversity scores
    const processingResults = await processPostsInBatches(
      posts, 
      databases, 
      DATABASE_ID, 
      COLLECTION_ID, 
      log,
      error,
      diversityScores
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
 * Calculate diversity score based on domain uniqueness
 * This function analyzes the top 100 articles and assigns diversity scores
 */
async function calculateDiversityScores(databases, databaseId, collectionId, log) {
  try {
    log('🌐 Calculating diversity scores for top 100 articles...');
    
    // Fetch top 100 articles by current score
    const topPosts = await databases.listDocuments(
      databaseId,
      collectionId,
      [
        Query.orderDesc('score'),
        Query.limit(100),
        Query.select(['$id', 'link', 'score'])
      ]
    );
    
    const domainMap = new Map(); // domain -> array of post IDs
    const diversityScores = new Map(); // post ID -> diversity score
    
    // Group posts by domain
    topPosts.documents.forEach(post => {
      if (post.link) {
        try {
          const domain = new URL(post.link).hostname;
          if (!domainMap.has(domain)) {
            domainMap.set(domain, []);
          }
          domainMap.get(domain).push({
            id: post.$id,
            score: post.score || 0
          });
        } catch (error) {
          // If URL parsing fails, treat as unique domain
          const uniqueDomain = `unknown-${post.$id}`;
          domainMap.set(uniqueDomain, [{
            id: post.$id,
            score: post.score || 0
          }]);
        }
      } else {
        // Posts without links get unique domain treatment
        const uniqueDomain = `no-link-${post.$id}`;
        domainMap.set(uniqueDomain, [{
          id: post.$id,
          score: post.score || 0
        }]);
      }
    });
    
    // Calculate diversity scores
    domainMap.forEach((posts, domain) => {
      if (posts.length === 1) {
        // Only article from this domain - give 100 diversity score
        diversityScores.set(posts[0].id, 100);
        log(`🌐 Domain ${domain}: Single article - Diversity Score: 100`);
      } else {
        // Multiple articles from same domain - sort by score and assign scores
        posts.sort((a, b) => b.score - a.score); // Highest score first
        
        // Give 100 to the highest scoring article, 0 to others
        diversityScores.set(posts[0].id, 100);
        for (let i = 1; i < posts.length; i++) {
          diversityScores.set(posts[i].id, 0);
        }
        
        log(`🌐 Domain ${domain}: ${posts.length} articles - Top article gets 100, others get 0`);
      }
    });
    
    log(`✅ Diversity scores calculated for ${diversityScores.size} articles`);
    return diversityScores;
    
  } catch (error) {
    log(`❌ Error calculating diversity scores: ${error.message}`);
    return new Map(); // Return empty map on error
  }
}

/**
 * Apply scoring algorithm to a single post
 */
function applyScoringAlgorithm(post, diversityScore = 0) {
  // Calculate new time score based on decay
  const newTimeScore = calculateTimeDecayScore(post.$createdAt, post.timeScore || 100);
  
  // Calculate final ranking score
  const finalScore = calculateFinalScore(post, newTimeScore, diversityScore);
  
  // Log scoring details for debugging (only for first few posts to avoid spam)
  if (Math.random() < 0.1) { // Log ~10% of posts for debugging
    console.log(`🔍 Post scoring debug - ID: ${post.$id}, Title: "${post.title?.substring(0, 50)}..."`);
    console.log(`   Relevancy Score: ${post.relevancyScore || 50} (Weight: ${(SCORING_WEIGHTS.relevancyScore * 100).toFixed(0)}%)`);
    console.log(`   Time Score: ${post.timeScore || 100} → ${newTimeScore}`);
    console.log(`   Diversity Score: ${diversityScore}`);
    console.log(`   Final Score: ${finalScore}`);
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
async function processPostsInBatches(posts, databases, databaseId, collectionId, log, error, diversityScores) {
  // Ensure diversityScores is properly initialized
  if (!diversityScores || !(diversityScores instanceof Map)) {
    log(`⚠️ Warning: diversityScores is not a valid Map in processPostsInBatches, creating empty Map`);
    diversityScores = new Map();
  }
  
  log(`🔍 Processing posts with diversityScores size: ${diversityScores.size}`);
  
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
        const diversityScore = diversityScores.get(post.$id) || 0;
        const updatedData = applyScoringAlgorithm(post, diversityScore);
        
        // Log diversity score assignment for first few posts
        if (results.batches === 1 && batch.indexOf(post) < 3) {
          log(`🔍 Post ${post.$id}: diversityScore = ${diversityScore} (from map: ${diversityScores.has(post.$id)})`);
        }
        
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
        log(`🌐 Diversity scores calculated for top 100 articles`);
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
