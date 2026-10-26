import { CircleUserRound, Hash, House, MessagesSquare, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: '/' | '/channels' | '/messages' | '/me'
  label: string
  icon: LucideIcon
  requiresAuth?: boolean
  /** Whether the item is the current section. */
  isActive: (pathname: string, userId: string | null) => boolean
}

/** The main feeds; Home covers all of them (the column's tabs switch between them). */
export const FEED_PATHS: ReadonlyArray<string> = ['/', '/new', '/show', '/following']

const HOME: NavItem = {
  to: '/',
  label: 'Home',
  icon: House,
  isActive: (pathname) => FEED_PATHS.includes(pathname),
}
const CHANNELS: NavItem = {
  to: '/channels',
  label: 'Channels',
  icon: Hash,
  isActive: (pathname) => pathname === '/channels' || pathname.startsWith('/c/'),
}
const MESSAGES: NavItem = {
  to: '/messages',
  label: 'Messages',
  icon: MessagesSquare,
  requiresAuth: true,
  isActive: (pathname) => pathname === '/messages' || pathname.startsWith('/messages/'),
}
const PROFILE: NavItem = {
  to: '/me',
  label: 'Profile',
  icon: CircleUserRound,
  requiresAuth: true,
  isActive: (pathname, userId) => Boolean(userId) && pathname === `/u/${userId}`,
}

/** Desktop sidebar and the phone tab bar share the same four sections. */
export const NAV_ITEMS: ReadonlyArray<NavItem> = [HOME, CHANNELS, MESSAGES, PROFILE]
export const TAB_ITEMS = NAV_ITEMS
