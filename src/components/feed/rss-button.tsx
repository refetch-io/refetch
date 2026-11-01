import { Rss } from 'lucide-react'
import { type FeedSource, feedPath } from '@/lib/feeds'
import { Button } from '../ui/button'
import { Tooltip } from '../ui/tooltip'

/** Opens a list's RSS feed (paste the address into any feed reader). */
export function RssButton({
  source,
  name,
  className,
}: {
  source: FeedSource
  name: string
  className?: string
}) {
  return (
    <Tooltip content="RSS feed">
      <Button asChild variant="ghost" size="icon-sm" className={className}>
        <a href={feedPath(source)} target="_blank" rel="noopener" aria-label={`RSS feed for ${name}`}>
          <Rss />
        </a>
      </Button>
    </Tooltip>
  )
}
