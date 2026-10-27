import * as React from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import {
  ACTION_KEYS,
  GO_TO,
  SEQUENCE_TIMEOUT_MS,
  SHORTCUT_GROUPS,
  isGoToKey,
  isTypingTarget,
  nextIndex,
  type KeyboardAction,
} from '@/lib/keyboard'
import { useSession } from '@/lib/session'
import { Dialog } from './ui/dialog'
import { Kbd } from './ui/misc'

const ShortcutsContext = React.createContext<{ openHelp: () => void }>({ openHelp: () => {} })

export function useKeyboardShortcuts() {
  return React.useContext(ShortcutsContext)
}

const ITEM = '[data-kb-item]'
const SELECTED = 'data-kb-selected'

function items(): Array<HTMLElement> {
  return Array.from(document.querySelectorAll<HTMLElement>(ITEM)).filter(
    (el) => el.getClientRects().length > 0,
  )
}

/** First row whose top is below the sticky header. */
function firstOnScreen(list: Array<HTMLElement>): number {
  const index = list.findIndex((el) => el.getBoundingClientRect().bottom > 132)
  return index < 0 ? 0 : index
}

/** An action inside a row, ignoring the rows nested in it (replies). */
function findAction(row: HTMLElement, action: KeyboardAction): HTMLElement | null {
  for (const el of row.querySelectorAll<HTMLElement>(`[data-kb-action="${action}"]`)) {
    if (el.closest(ITEM) === row) return el
  }
  return null
}

function anyDialogOpen() {
  return Boolean(document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]'))
}

/**
 * Global shortcuts for the app shell: j/k selection over lists, single-key
 * actions on the selected row, `g` + key to change page, and `?` for help.
 */
export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const { user } = useSession()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [helpOpen, setHelpOpen] = React.useState(false)
  const selected = React.useRef<HTMLElement | null>(null)
  const pendingG = React.useRef(0)

  const select = React.useCallback((el: HTMLElement | null) => {
    selected.current?.removeAttribute(SELECTED)
    selected.current = el
    if (!el) return
    el.setAttribute(SELECTED, '')
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [])

  // A new page starts without a selection.
  React.useEffect(() => select(null), [pathname, select])

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target) || anyDialogOpen()) return
      const key = event.key

      // Second key of a `g` sequence.
      if (pendingG.current && Date.now() - pendingG.current < SEQUENCE_TIMEOUT_MS) {
        pendingG.current = 0
        if (isGoToKey(key)) {
          event.preventDefault()
          const { to } = GO_TO[key]
          const needsAuth = to !== '/' && to !== '/new' && to !== '/show' && to !== '/channels'
          void navigate(needsAuth && !user ? { to: '/signin', search: { redirect: to } } : { to })
        }
        return
      }
      pendingG.current = 0

      if (key === 'g') {
        pendingG.current = Date.now()
        return
      }
      if (key === '?') {
        event.preventDefault()
        setHelpOpen(true)
        return
      }
      if (key === 'j' || key === 'k') {
        event.preventDefault()
        const list = items()
        const current = selected.current ? list.indexOf(selected.current) : -1
        const index = nextIndex(current, list.length, key === 'j' ? 1 : -1, firstOnScreen(list))
        if (index >= 0) select(list[index])
        return
      }
      if (key === 'Escape' && selected.current) {
        select(null)
        return
      }
      if (key === 'n' || key === 'p') {
        const link = document.querySelector<HTMLElement>(
          `[data-kb-page="${key === 'n' ? 'next' : 'previous'}"]`,
        )
        if (link) {
          event.preventDefault()
          link.click()
        }
        return
      }

      const action = ACTION_KEYS[key]
      const row = selected.current
      if (!action || !row || !row.isConnected) return
      // Enter on a focused control belongs to that control.
      if (key === 'Enter' && document.activeElement?.closest('a, button, [role="button"]')) return
      // Rows that are links themselves (notifications) open directly.
      const target = findAction(row, action) ?? (action === 'open' && row.matches('a') ? row : null)
      if (!target) return
      event.preventDefault()
      target.click()
      // Typing a reply or edit takes over the keyboard.
      if (action === 'reply' || action === 'edit') select(null)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate, select, user])

  const value = React.useMemo(() => ({ openHelp: () => setHelpOpen(true) }), [])

  return (
    <ShortcutsContext.Provider value={value}>
      {children}
      <ShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </ShortcutsContext.Provider>
  )
}

function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Keyboard shortcuts" className="sm:max-w-[560px]">
      <div className="grid gap-x-8 gap-y-6 px-5 py-5 sm:grid-cols-2">
        {SHORTCUT_GROUPS.map((group) => (
          <section key={group.title} className={group.title === 'Pages' ? 'sm:row-span-2' : undefined}>
            <h3 className="mb-2 text-caption-1 font-semibold tracking-[0.06em] text-label-tertiary uppercase">
              {group.title}
            </h3>
            <dl className="space-y-1.5">
              {group.shortcuts.map((shortcut) => (
                <div key={shortcut.label} className="flex items-center justify-between gap-4 text-footnote">
                  <dt className="text-label-secondary">{shortcut.label}</dt>
                  <dd className="flex shrink-0 items-center gap-1">
                    {shortcut.keys.map((key, i) => (
                      <React.Fragment key={key}>
                        {i > 0 && shortcut.keys[0] === 'g' && (
                          <span className="text-caption-2 text-label-tertiary">then</span>
                        )}
                        <Kbd className="min-w-5 justify-center">{key}</Kbd>
                      </React.Fragment>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  )
}
