import { describe, expect, it } from 'vitest'
import { movedPath, safeRedirect } from './redirect'

describe('safeRedirect', () => {
  it('keeps same-origin paths and rejects everything else', () => {
    expect(safeRedirect('/threads/1')).toBe('/threads/1')
    expect(safeRedirect('//evil.com')).toBe('/')
    expect(safeRedirect('/signin')).toBe('/')
  })
})

describe('movedPath', () => {
  it('swaps the old prefix and keeps the rest of the path and the query', () => {
    expect(movedPath('/c/rust', '/c', '/channels')).toBe('/channels/rust')
    expect(movedPath('/c/rust?sort=new&page=2', '/c', '/channels')).toBe('/channels/rust?sort=new&page=2')
    expect(movedPath('/u/abc/followers', '/u', '/users')).toBe('/users/abc/followers')
  })

  it('leaves other paths alone', () => {
    expect(movedPath('/channels/rust', '/c', '/channels')).toBe('/channels/rust')
    expect(movedPath('/cats', '/c', '/channels')).toBe('/cats')
  })
})
