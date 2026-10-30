import {
  ChartNoAxesColumn,
  CircleUserRound,
  Hash,
  House,
  MessagesSquare,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: '/' | '/channels' | '/stats' | '/messages' | '/me'
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
  isActive: (pathname) =>
    pathname === '/channels' || pathname.startsWith('/channels/') || pathname.startsWith('/topics'),
}
const STATS: NavItem = {
  to: '/stats',
  label: 'Stats',
  icon: ChartNoAxesColumn,
  isActive: (pathname) => pathname === '/stats',
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
  isActive: (pathname, userId) =>
    Boolean(userId) && (pathname === `/users/${userId}` || pathname.startsWith(`/users/${userId}/`)),
}

/** The desktop sidebar adds Stats; the phone tab bar keeps to four sections (Stats is in Search). */
export const NAV_ITEMS: ReadonlyArray<NavItem> = [HOME, CHANNELS, MESSAGES, PROFILE, STATS]
export const TAB_ITEMS: ReadonlyArray<NavItem> = [HOME, CHANNELS, MESSAGES, PROFILE]
