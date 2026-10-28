import { Link } from '@tanstack/react-router'
import { Hash } from 'lucide-react'
import { topicKey } from '@/lib/topics'
import { cn, compactNumber } from '@/lib/utils'
import { badgeVariants } from '../ui/badge'

/** A topic as a `#label` pill linking to its page. Labels that slug to nothing stay plain. */
export function TopicChip({
  label,
  count,
  className,
}: {
  label: string
  count?: number
  className?: string
}) {
  const key = topicKey(label)
  const content = (
    <>
      <Hash className="!size-3 text-label-tertiary" aria-hidden />
      {label}
      {count !== undefined && (
        <span className="ml-0.5 font-normal text-label-tertiary tabular">{compactNumber(count)}</span>
      )}
    </>
  )
  const classes = cn(badgeVariants({ variant: 'neutral', size: 'md' }), 'gap-0.5 font-medium', className)
  if (!key) return <span className={classes}>{content}</span>
  return (
    <Link
      to="/topics/$topicKey"
      params={{ topicKey: key }}
      className={cn(classes, 'transition-colors hover:bg-fill-strong hover:text-label')}
    >
      {content}
    </Link>
  )
}

export function TopicChips({
  topics,
  label,
  showCounts,
  className,
}: {
  topics: Array<{ key: string; label: string; articleCount?: number }>
  /** Accessible name for the list. */
  label?: string
  showCounts?: boolean
  className?: string
}) {
  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)} aria-label={label}>
      {topics.map((topic) => (
        <li key={topic.key}>
          <TopicChip label={topic.label} count={showCounts ? topic.articleCount : undefined} />
        </li>
      ))}
    </ul>
  )
}
