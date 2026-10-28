/**
 * Topics are the free-form labels the Enhancement function gives each story
 * ("AI", "space exploration"). Pages address them by a slug key.
 */

/** URL key for a topic. Same normalization as functions/topic-stats, so keys line up. */
export function topicKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

/** Labels come in any case ("security"); show them capitalized. */
export function topicDisplayLabel(label: string): string {
  const trimmed = label.trim()
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

/** Best guess at a label from its key, for topics the stats table hasn't seen yet. */
export function labelFromKey(key: string): string {
  return key.replace(/-/g, ' ')
}

/**
 * Spellings a story may use for the same topic. Stories store the raw label,
 * so a topic page matches all the common casings of it.
 */
export function topicLabelVariants(label: string): Array<string> {
  const base = label.trim().replace(/\s+/g, ' ')
  if (!base) return []
  const lower = base.toLowerCase()
  const title = lower.replace(
    /(^|[\s-])(\p{L})/gu,
    (_, start: string, letter: string) => start + letter.toUpperCase(),
  )
  const sentence = lower.charAt(0).toUpperCase() + lower.slice(1)
  return [...new Set([base, lower, title, sentence, base.toUpperCase()])]
}
