import { describe, expect, it } from 'vitest'
import { GO_TO, SHORTCUT_GROUPS, isGoToKey, nextIndex } from './keyboard'

describe('nextIndex', () => {
  it('moves within the list and stops at the ends', () => {
    expect(nextIndex(0, 3, 1)).toBe(1)
    expect(nextIndex(2, 3, 1)).toBe(2)
    expect(nextIndex(0, 3, -1)).toBe(0)
  })

  it('starts at the first row on screen when nothing is selected', () => {
    expect(nextIndex(-1, 10, 1, 4)).toBe(4)
    expect(nextIndex(-1, 10, -1, 4)).toBe(3)
    expect(nextIndex(-1, 10, -1, 0)).toBe(0)
  })

  it('returns -1 for an empty list', () => {
    expect(nextIndex(-1, 0, 1)).toBe(-1)
  })
})

describe('go-to shortcuts', () => {
  it('only recognizes the listed keys', () => {
    expect(isGoToKey('h')).toBe(true)
    expect(isGoToKey('toString')).toBe(false)
    expect(isGoToKey('z')).toBe(false)
  })

  it('lists every go-to key in the help', () => {
    const pages = SHORTCUT_GROUPS.find((group) => group.title === 'Pages')!
    for (const key of Object.keys(GO_TO)) {
      expect(pages.shortcuts.some((shortcut) => shortcut.keys.join(' ') === `g ${key}`)).toBe(true)
    }
  })
})
