import { Bot } from 'lucide-react'
import { Badge } from './ui/badge'
import { Tooltip } from './ui/tooltip'

const BOT_EXPLAINER =
  'Bots help keep Refetch fresh with relevant stories, and are ranked exactly like everyone else. Their source code is in our open-source repo.'

export function BotBadge() {
  return (
    <Tooltip content={BOT_EXPLAINER}>
      <Badge variant="brand" size="xs" tabIndex={0} className="cursor-help gap-0.5">
        <Bot className="!size-2.5" aria-hidden />
        bot
      </Badge>
    </Tooltip>
  )
}
