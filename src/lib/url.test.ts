import { describe, expect, it } from 'vitest'
import { cleanUrl, hostnameOf, isHttpUrl, isValidId, withRef } from './url'

describe('url helpers', () => {
  it('strips query strings and fragments', () => {
    expect(cleanUrl('https://a.com/p?x=1#y')).toBe('https://a.com/p')
    expect(cleanUrl('not a url')).toBe('not a url')
  })

  it('accepts only http(s) links', () => {
    expect(isHttpUrl('https://refetch.io')).toBe(true)
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isHttpUrl('ftp://x.org')).toBe(false)
  })

  it('shows hostnames without www', () => {
    expect(hostnameOf('https://www.example.com/a')).toBe('example.com')
    expect(hostnameOf(null)).toBeNull()
  })

  it('tags outbound links', () => {
    expect(withRef('https://a.com/p?x=1')).toBe('https://a.com/p?x=1&ref=refetch.io')
  })

  it('validates Appwrite IDs', () => {
    expect(isValidId('68c917670014c1882305')).toBe(true)
    expect(isValidId('_leading')).toBe(false)
    expect(isValidId('a'.repeat(37))).toBe(false)
  })
})
