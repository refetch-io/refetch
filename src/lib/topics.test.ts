import { describe, expect, it } from 'vitest'
import { labelFromKey, topicDisplayLabel, topicKey, topicLabelVariants } from './topics'

describe('topicKey', () => {
  it('slugs labels the way the topic-stats function does', () => {
    expect(topicKey('Space Exploration')).toBe('space-exploration')
    expect(topicKey('  AI  ')).toBe('ai')
    expect(topicKey('Node.js')).toBe('nodejs')
    expect(topicKey('C++ / Rust')).toBe('c-rust')
  })
})

describe('topicDisplayLabel', () => {
  it('capitalizes the first letter only', () => {
    expect(topicDisplayLabel('space exploration')).toBe('Space exploration')
    expect(topicDisplayLabel('OpenAI')).toBe('OpenAI')
  })
})

describe('labelFromKey', () => {
  it('turns a key back into words', () => {
    expect(labelFromKey('machine-learning')).toBe('machine learning')
  })
})

describe('topicLabelVariants', () => {
  it('covers the common casings without duplicates', () => {
    expect(topicLabelVariants('space exploration')).toEqual([
      'space exploration',
      'Space Exploration',
      'Space exploration',
      'SPACE EXPLORATION',
    ])
    expect(topicLabelVariants('AI')).toEqual(['AI', 'ai', 'Ai'])
  })

  it('ignores blank labels', () => {
    expect(topicLabelVariants('  ')).toEqual([])
  })
})
