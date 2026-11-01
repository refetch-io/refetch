import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { insertMention, mentionQueryAt, nameMatches, presentMentions } from '@/lib/mentions'
import { mentionableQuery } from '@/lib/queries'
import type { PersonSummary } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Avatar } from '../ui/avatar'

/** People in the thread (story author and commenters), offered first when you type `@`. */
const ParticipantsContext = React.createContext<ReadonlyArray<PersonSummary>>([])

export const MentionParticipants = ParticipantsContext.Provider

const MAX_OPTIONS = 6

interface Options {
  text: string
  setText: (text: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}

/**
 * `@` autocomplete for a textarea. Wire `sync` to the textarea's change and
 * selection events and call `onKeyDown` first in its key handler; when it
 * returns true the key was used to pick someone.
 */
export function useMentions({ text, setText, textareaRef }: Options) {
  const participants = React.useContext(ParticipantsContext)
  const listId = React.useId()
  const [caret, setCaret] = React.useState(0)
  const [active, setActive] = React.useState(0)
  // Escape hides the list for the `@` it was open for.
  const [dismissed, setDismissed] = React.useState<number | null>(null)
  const [picked, setPicked] = React.useState<Array<PersonSummary>>([])

  const mention = mentionQueryAt(text, caret)
  const searching = mention !== null && mention.start !== dismissed
  const remoteTerm = searching ? mention.query.trim() : ''
  const { data: remote } = useQuery({ ...mentionableQuery(remoteTerm), enabled: remoteTerm.length >= 2 })

  const options = React.useMemo(() => {
    if (!searching) return []
    const local = participants.filter((person) => nameMatches(person.name, mention.query))
    // The last results stay up while the next search runs; keep the ones that still match.
    const more = (remoteTerm.length >= 2 ? (remote ?? []) : []).filter(
      (person) => nameMatches(person.name, mention.query) && !local.some((p) => p.id === person.id),
    )
    return [...local, ...more].slice(0, MAX_OPTIONS)
  }, [searching, participants, mention?.query, remoteTerm, remote])

  const open = options.length > 0
  const activeIndex = Math.min(active, Math.max(0, options.length - 1))

  React.useEffect(() => setActive(0), [mention?.query])

  const sync = React.useCallback(() => {
    const el = textareaRef.current
    if (el) setCaret(el.selectionStart ?? el.value.length)
  }, [textareaRef])

  const choose = (person: PersonSummary) => {
    if (!mention) return
    const next = insertMention(text, mention, caret, person.name)
    setText(next.text)
    setCaret(next.caret)
    setPicked((list) => [...list.filter((p) => p.id !== person.id), person])
    requestAnimationFrame(() => {
      const el = textareaRef.current
      el?.focus()
      el?.setSelectionRange(next.caret, next.caret)
    })
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
    if (!open || event.metaKey || event.ctrlKey || event.altKey) return false
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((activeIndex + step + options.length) % options.length)
      return true
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      choose(options[activeIndex])
      return true
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setDismissed(mention?.start ?? null)
      return true
    }
    return false
  }

  /** IDs of the people the final text mentions (picked from the list, or thread people typed out in full). */
  const mentionIds = (finalText: string) =>
    presentMentions(finalText, [...picked, ...participants]).map((person) => person.id)

  const reset = () => {
    setPicked([])
    setDismissed(null)
  }

  const textareaProps = {
    'aria-autocomplete': 'list' as const,
    'aria-controls': open ? listId : undefined,
    'aria-expanded': open,
    'aria-activedescendant': open ? `${listId}-${activeIndex}` : undefined,
  }

  const menu = (placement: 'above' | 'below') =>
    open ? (
      <div
        id={listId}
        role="listbox"
        aria-label="People to mention"
        className={cn(
          'absolute inset-x-0 z-40 max-w-80 animate-scale-in rounded-[14px] glass-strong p-1.5 shadow-popover',
          placement === 'above' ? 'bottom-full mb-2 origin-bottom-left' : 'top-full mt-1 origin-top-left',
        )}
      >
        {options.map((person, index) => (
          <div
            key={person.id}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            // Keep focus (and the caret) in the textarea.
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => setActive(index)}
            onClick={() => choose(person)}
            className={cn(
              'flex h-9 cursor-default items-center gap-2.5 rounded-[9px] px-2 text-subhead',
              index === activeIndex ? 'bg-brand text-on-brand' : 'text-label',
            )}
          >
            <Avatar name={person.name} userId={person.id} size={24} />
            <span className="truncate">{person.name}</span>
          </div>
        ))}
      </div>
    ) : null

  return { open, menu, sync, onKeyDown, mentionIds, reset, textareaProps }
}
