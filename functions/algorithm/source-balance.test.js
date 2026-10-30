import { describe, expect, it } from 'vitest'
import { balanceSources, domainOf, saturationMultiplier } from './source-balance.js'

const config = { freePerDomain: 2, decay: 0.5, floor: 0.2 }

describe('domainOf', () => {
  it('drops www and lowercases', () => {
    expect(domainOf('https://WWW.Example.com/a')).toBe('example.com')
  })

  it('returns null for missing or invalid links', () => {
    expect(domainOf(undefined)).toBeNull()
    expect(domainOf('not a url')).toBeNull()
  })
})

describe('saturationMultiplier', () => {
  it('leaves the free allowance untouched, then compounds down to the floor', () => {
    expect([0, 1, 2, 3, 4, 5].map((rank) => saturationMultiplier(rank, config))).toEqual([
      1, 1, 0.5, 0.25, 0.2, 0.2,
    ])
  })
})

describe('balanceSources', () => {
  it('ranks within a domain by base score and only rewards the top post with diversity', () => {
    const balance = balanceSources(
      [
        { id: 'a', link: 'https://dev.to/x', baseScore: 40 },
        { id: 'b', link: 'https://dev.to/y', baseScore: 60 },
        { id: 'c', link: 'https://dev.to/z', baseScore: 50 },
        { id: 'd', link: 'https://example.com/1', baseScore: 10 },
      ],
      config,
      {},
    )
    expect(balance.get('b')).toMatchObject({ rank: 0, diversityScore: 100, multiplier: 1 })
    expect(balance.get('c')).toMatchObject({ rank: 1, diversityScore: 0, multiplier: 1 })
    expect(balance.get('a')).toMatchObject({ rank: 2, diversityScore: 0, multiplier: 0.5 })
    expect(balance.get('d')).toMatchObject({ rank: 0, diversityScore: 100, multiplier: 1 })
  })

  it('applies per-source weights on top of saturation', () => {
    const balance = balanceSources(
      [
        { id: 'a', link: 'https://dev.to/x', baseScore: 60 },
        { id: 'b', link: 'https://dev.to/y', baseScore: 50 },
        { id: 'c', link: 'https://dev.to/z', baseScore: 40 },
      ],
      config,
      { 'dev.to': 0.8 },
    )
    expect(balance.get('a')?.multiplier).toBeCloseTo(0.8)
    expect(balance.get('c')?.multiplier).toBeCloseTo(0.4)
  })

  it('treats posts without a domain as their own source', () => {
    const balance = balanceSources(
      [
        { id: 'a', baseScore: 10 },
        { id: 'b', link: 'nope', baseScore: 20 },
      ],
      config,
      {},
    )
    expect(balance.get('a')).toMatchObject({ domain: null, rank: 0, diversityScore: 100 })
    expect(balance.get('b')).toMatchObject({ domain: null, rank: 0, diversityScore: 100 })
  })
})
