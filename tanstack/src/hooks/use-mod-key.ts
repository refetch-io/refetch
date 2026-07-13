import { useEffect, useState } from 'react'

export type ModKeyLabel = '⌘' | 'Ctrl'

/** Resolves ⌘ vs Ctrl after mount to avoid flashing the wrong shortcut. */
export function useModKeyLabel(): ModKeyLabel | null {
  const [modKey, setModKey] = useState<ModKeyLabel | null>(null)

  useEffect(() => {
    const isApple = /Mac|iPhone|iPad|iPod/i.test(navigator.platform)
    setModKey(isApple ? '⌘' : 'Ctrl')
  }, [])

  return modKey
}
