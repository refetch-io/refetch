import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  Briefcase,
  Clock,
  Code2,
  Cpu,
  Globe,
  Hash,
  Monitor,
  Plus,
  Rocket,
  Settings2,
  Smartphone,
  TrendingUp,
  User,
} from 'lucide-react'

export type AppNavItem = {
  to: '/' | '/show' | '/new' | '/mines' | '/submit' | '/account' | '/signin'
  label: string
  icon: LucideIcon
  auth?: boolean
  group: 'discover' | 'workspace'
}

export type ChannelNavItem = {
  id: string
  label: string
  icon: LucideIcon
}

export const DISCOVER_NAV: AppNavItem[] = [
  { to: '/', label: 'Top', icon: TrendingUp, group: 'discover' },
  { to: '/show', label: 'Show', icon: Monitor, group: 'discover' },
  { to: '/new', label: 'New', icon: Clock, group: 'discover' },
]

/** Mock channels for sidebar preview — not routed yet. */
export const CHANNELS_NAV: ChannelNavItem[] = [
  { id: 'ai', label: 'AI & ML', icon: Bot },
  { id: 'startups', label: 'Startups', icon: Rocket },
  { id: 'open-source', label: 'Open source', icon: Code2 },
  { id: 'engineering', label: 'Engineering', icon: Hash },
  { id: 'devtools', label: 'DevTools', icon: Cpu },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
  { id: 'product', label: 'Product', icon: Briefcase },
  { id: 'web', label: 'Web', icon: Globe },
]

export const WORKSPACE_NAV: AppNavItem[] = [
  { to: '/submit', label: 'Submit', icon: Plus, group: 'workspace', auth: true },
  { to: '/mines', label: 'My posts', icon: User, group: 'workspace', auth: true },
  {
    to: '/account',
    label: 'Account',
    icon: Settings2,
    group: 'workspace',
    auth: true,
  },
]

export const ALL_NAV = [...DISCOVER_NAV, ...WORKSPACE_NAV]

export const PAGE_TITLES: Record<string, string> = {
  '/': 'Top',
  '/new': 'New',
  '/show': 'Show',
  '/mines': 'My posts',
  '/submit': 'Submit',
  '/signin': 'Sign in',
  '/signup': 'Sign up',
  '/account': 'Account',
}

export function resolvePageTitle(pathname: string) {
  if (pathname.startsWith('/threads/')) return 'Thread'
  return PAGE_TITLES[pathname] ?? 'Refetch'
}

export function isNavActive(pathname: string, to: string) {
  return to === '/' ? pathname === '/' : pathname.startsWith(to)
}
