import type { LucideIcon } from 'lucide-react'
import { Eye, KeyRound, Shield, User } from 'lucide-react'

export type AccountNavItem = {
  to: '/account' | '/account/privacy' | '/account/keys' | '/account/security'
  label: string
  description: string
  icon: LucideIcon
}

export const ACCOUNT_NAV: AccountNavItem[] = [
  {
    to: '/account',
    label: 'Profile',
    description: 'Name, email, and public identity.',
    icon: User,
  },
  {
    to: '/account/privacy',
    label: 'Privacy',
    description: 'Presence and what others can see.',
    icon: Eye,
  },
  {
    to: '/account/keys',
    label: 'API keys',
    description: 'Keys for scripts and integrations.',
    icon: KeyRound,
  },
  {
    to: '/account/security',
    label: 'Security',
    description: 'Password and signed-in sessions.',
    icon: Shield,
  },
]

export function isAccountPath(pathname: string) {
  return pathname === '/account' || pathname.startsWith('/account/')
}

export function isAccountNavActive(pathname: string, to: string) {
  if (to === '/account') return pathname === '/account' || pathname === '/account/'
  return pathname.startsWith(to)
}
