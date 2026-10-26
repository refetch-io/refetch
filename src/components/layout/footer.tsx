import { Heart } from 'lucide-react'
import { LINKS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Logo } from '../logo'
import { GitHubIcon, XIcon } from '../brand-icons'

const linkClass = 'transition-colors hover:text-label'

export function SiteFooter({
  variant = 'sidebar',
  className,
}: {
  variant?: 'sidebar' | 'page'
  className?: string
}) {
  const centered = variant === 'page'
  return (
    <footer className={cn('text-caption-1 text-label-tertiary', centered && 'text-center', className)}>
      <Logo className={cn('h-[18px] w-auto', centered && 'mx-auto')} />
      <p className={cn('mt-3 leading-relaxed text-label-secondary', centered && 'mx-auto max-w-sm')}>
        Your daily drop of curated tech news. Signal over noise. Transparent. Community‑driven.
      </p>

      <nav
        aria-label="Footer"
        className={cn('mt-4 flex flex-wrap items-center gap-x-3 gap-y-2', centered && 'justify-center')}
      >
        <a href={LINKS.github} target="_blank" rel="noopener noreferrer" className={linkClass}>
          About
        </a>
        <a href={LINKS.algorithm} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Algorithm
        </a>
        <a href={LINKS.terms} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Terms
        </a>
        <a href={LINKS.privacy} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Privacy
        </a>
        <a href={LINKS.security} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Security
        </a>
      </nav>

      <div className={cn('mt-4 flex items-center gap-2', centered && 'justify-center')}>
        <a
          href={LINKS.sponsor}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-7 pressable items-center gap-1.5 rounded-full bg-fill px-3 font-semibold text-label-secondary hover:text-label"
        >
          <Heart className="size-3.5 text-[#ff375f]" fill="currentColor" aria-hidden />
          Donate
        </a>
        <a
          href={LINKS.x}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Refetch on X"
          className="grid size-7 pressable place-items-center rounded-full bg-fill text-label-secondary hover:text-label"
        >
          <XIcon className="size-3.5" />
        </a>
        <a
          href={LINKS.github}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Refetch on GitHub"
          className="grid size-7 pressable place-items-center rounded-full bg-fill text-label-secondary hover:text-label"
        >
          <GitHubIcon className="size-3.5" />
        </a>
      </div>

      <p className="mt-4">
        © {new Date().getFullYear()} Refetch ·{' '}
        <a href={LINKS.appwrite} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Powered by Appwrite
        </a>
      </p>
    </footer>
  )
}
