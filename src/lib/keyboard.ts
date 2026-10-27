/*
 * Keyboard navigation, Gmail/HN-reader style. Lists mark their rows with
 * `data-kb-item` and the controls inside them with `data-kb-action="…"`;
 * the shortcuts provider moves a selection over the rows and clicks actions.
 */

export type KeyboardAction =
  'open' | 'comments' | 'upvote' | 'downvote' | 'save' | 'reply' | 'edit' | 'report'

/** Single keys that click an action inside the selected row. */
export const ACTION_KEYS: Record<string, KeyboardAction> = {
  o: 'open',
  Enter: 'open',
  c: 'comments',
  u: 'upvote',
  d: 'downvote',
  s: 'save',
  r: 'reply',
  e: 'edit',
}

/** `g` followed by a key jumps to a page. */
export const GO_TO = {
  h: { to: '/', label: 'Top stories' },
  n: { to: '/new', label: 'Newest' },
  w: { to: '/show', label: 'Show Refetch' },
  f: { to: '/following', label: 'Following' },
  c: { to: '/channels', label: 'Channels' },
  m: { to: '/messages', label: 'Messages' },
  i: { to: '/notifications', label: 'Notifications' },
  s: { to: '/saved', label: 'Saved' },
  p: { to: '/me', label: 'Your profile' },
} as const

export type GoToKey = keyof typeof GO_TO

export function isGoToKey(key: string): key is GoToKey {
  return Object.hasOwn(GO_TO, key)
}

/** How long after `g` the second key still counts. */
export const SEQUENCE_TIMEOUT_MS = 1200

export interface ShortcutGroup {
  title: string
  shortcuts: Array<{ keys: Array<string>; label: string }>
}

export const SHORTCUT_GROUPS: Array<ShortcutGroup> = [
  {
    title: 'Stories and comments',
    shortcuts: [
      { keys: ['j'], label: 'Next' },
      { keys: ['k'], label: 'Previous' },
      { keys: ['o'], label: 'Open the story' },
      { keys: ['c'], label: 'Open the discussion' },
      { keys: ['u'], label: 'Upvote' },
      { keys: ['d'], label: 'Downvote' },
      { keys: ['s'], label: 'Save for later' },
      { keys: ['r'], label: 'Reply to the comment' },
      { keys: ['e'], label: 'Edit your comment' },
      { keys: ['Esc'], label: 'Clear the selection' },
    ],
  },
  {
    title: 'Pages',
    shortcuts: [
      ...Object.entries(GO_TO).map(([key, page]) => ({ keys: ['g', key], label: page.label })),
      { keys: ['n'], label: 'Next page' },
      { keys: ['p'], label: 'Previous page' },
    ],
  },
  {
    title: 'Anywhere',
    shortcuts: [
      { keys: ['/'], label: 'Search' },
      { keys: ['⌘', 'K'], label: 'Command center' },
      { keys: ['?'], label: 'Keyboard shortcuts' },
    ],
  },
]

/**
 * Index of the next row to select. With nothing selected, `j` starts at the
 * first row on screen (`firstVisible`) and `k` at the one before it.
 */
export function nextIndex(current: number, count: number, delta: 1 | -1, firstVisible = 0): number {
  if (count === 0) return -1
  if (current < 0) return Math.max(0, Math.min(count - 1, delta > 0 ? firstVisible : firstVisible - 1))
  return Math.max(0, Math.min(count - 1, current + delta))
}

export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return Boolean(el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)))
}
