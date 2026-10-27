export const FEED_PAGE_SIZE = 25
export const FEED_MAX_PAGES = 10

/** Replies can nest three levels deep (root → reply → reply). */
export const MAX_COMMENT_DEPTH = 2

/** How long after posting a comment its author can still edit it. */
export const COMMENT_EDIT_WINDOW_MS = 60 * 60_000

export const LIMITS = {
  titleMax: 300,
  urlMax: 2048,
  commentMax: 10_000,
  submissionNoteMax: 2_000,
  nameMax: 128,
  passwordMin: 8,
  passwordMax: 256,
  bioMax: 280,
  websiteMax: 256,
  messageMax: 4_000,
  groupNameMax: 80,
  photoMaxBytes: 5 * 1024 * 1024,
} as const

/** People suggested to everyone during onboarding (preselected). */
export const FEATURED_PEOPLE = ['68963467d3b94892ac83']

/** Channels preselected during onboarding, then other suggestions. */
export const ONBOARDING_CHANNELS = {
  selected: ['appwrite'],
  suggested: ['javascript', 'typescript', 'python', 'ai', 'opensource', 'postgresql', 'web', 'security'],
}

/** Largest group conversation, including its creator. */
export const MAX_GROUP_MEMBERS = 32

/** Quick reactions offered on messages. */
export const MESSAGE_REACTIONS = ['👍', '❤️', '😂', '🎉', '😮', '😢', '🙏', '🔥'] as const

export const LINKS = {
  github: 'https://github.com/refetch-io/refetch',
  algorithm: 'https://github.com/refetch-io/refetch/tree/main/functions/algorithm',
  sponsor: 'https://github.com/sponsors/refetch-io',
  x: 'https://x.com/refetch_io',
  appwrite: 'https://appwrite.io',
  terms: 'https://appwrite.io/terms',
  privacy: 'https://appwrite.io/privacy',
  security: 'https://appwrite.io/docs/advanced/security',
} as const
