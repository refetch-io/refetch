/**
 * Source balancing
 *
 * Keeps any single source from flooding the feed. Posts are grouped by domain
 * within the current scoring window and ranked by their base score:
 * - The top post per domain earns the full diversity score, the rest get 0.
 * - Past a small free allowance, each extra post from the same domain is
 *   multiplied down further, so a source that publishes 300 posts a day can't
 *   take over the top of the feed by volume alone.
 * - Some sources also carry a fixed quality weight on top of that.
 *
 * Kept free of Appwrite imports so it can be unit tested on its own.
 */

/**
 * Volume saturation settings
 */
export const SATURATION_CONFIG = {
  freePerDomain: 3,   // Posts per domain that are never penalized
  decay: 0.85,        // Multiplier compounded for each post past the allowance
  floor: 0.4          // Lowest multiplier a saturated post can reach
};

/**
 * Fixed per-source weights (1 = neutral). Use for sources whose average quality
 * is lower than what the AI scores suggest. Keyed by domain without "www.".
 */
export const SOURCE_WEIGHTS = {
  'dev.to': 0.9
};

/**
 * Normalize a post link to the domain used for grouping
 */
export function domainOf(link) {
  if (!link) return null;
  try {
    return new URL(link).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Multiplier for the post at `rank` (0-based) within its domain
 */
export function saturationMultiplier(rank, config = SATURATION_CONFIG) {
  if (rank < config.freePerDomain) return 1;
  const extra = rank - config.freePerDomain + 1;
  return Math.max(config.floor, Math.pow(config.decay, extra));
}

/**
 * Compute diversity score and score multiplier for every post in the window
 *
 * @param {Array<{ id: string, link?: string, baseScore: number }>} posts
 * @returns {Map<string, { domain: string|null, rank: number, diversityScore: number, multiplier: number }>}
 */
export function balanceSources(posts, config = SATURATION_CONFIG, weights = SOURCE_WEIGHTS) {
  const byDomain = new Map();
  const result = new Map();

  for (const post of posts) {
    const domain = domainOf(post.link);
    // Posts without a parsable link are treated as their own source
    const key = domain ?? `no-domain-${post.id}`;
    if (!byDomain.has(key)) byDomain.set(key, []);
    byDomain.get(key).push({ ...post, domain });
  }

  for (const group of byDomain.values()) {
    group.sort((a, b) => b.baseScore - a.baseScore);
    group.forEach((post, rank) => {
      const weight = (post.domain && weights[post.domain]) ?? 1;
      result.set(post.id, {
        domain: post.domain,
        rank,
        diversityScore: rank === 0 ? 100 : 0,
        multiplier: saturationMultiplier(rank, config) * weight
      });
    });
  }

  return result;
}
