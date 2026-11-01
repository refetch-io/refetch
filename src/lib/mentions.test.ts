import { describe, expect, it } from 'vitest'
import { insertMention, mentionQueryAt, nameMatches, presentMentions, splitMentions } from './mentions'

const ada = { id: 'u1', name: 'Ada Lovelace' }
const al = { id: 'u2', name: 'Ada' }
const grace = { id: 'u3', name: 'Grace' }

describe('mentionQueryAt', () => {
  it('finds the name being typed', () => {
    expect(mentionQueryAt('hi @Ad', 6)).toEqual({ start: 3, query: 'Ad' })
    expect(mentionQueryAt('@', 1)).toEqual({ start: 0, query: '' })
    expect(mentionQueryAt('thanks (@Ada Lo', 15)).toEqual({ start: 8, query: 'Ada Lo' })
  })

  it('ignores emails, finished thoughts and new lines', () => {
    expect(mentionQueryAt('me@example', 10)).toBeNull()
    expect(mentionQueryAt('@ada and then a lot more', 24)).toBeNull()
    expect(mentionQueryAt('@ada\nnext', 9)).toBeNull()
    expect(mentionQueryAt('@ ada', 5)).toBeNull()
  })
})

describe('insertMention', () => {
  it('replaces the typed part and moves the caret after the name', () => {
    const text = 'hi @Ad there'
    expect(insertMention(text, { start: 3, query: 'Ad' }, 6, 'Ada Lovelace')).toEqual({
      text: 'hi @Ada Lovelace there',
      caret: 17,
    })
  })
})

describe('nameMatches', () => {
  it('matches the start of any word', () => {
    expect(nameMatches('Ada Lovelace', 'love')).toBe(true)
    expect(nameMatches('Ada Lovelace', 'ada l')).toBe(true)
    expect(nameMatches('Ada Lovelace', 'race')).toBe(false)
    expect(nameMatches('Grace', '')).toBe(true)
  })
})

describe('presentMentions', () => {
  it('keeps people whose full name is mentioned, preferring the longest name', () => {
    expect(presentMentions('thanks @Ada Lovelace!', [al, ada, grace])).toEqual([ada])
    expect(presentMentions('@ada and @grace', [ada, al, grace])).toEqual([al, grace])
    expect(presentMentions('email ada@grace.dev', [grace, al])).toEqual([])
    expect(presentMentions('@Gracefully', [grace])).toEqual([])
  })
})

describe('splitMentions', () => {
  it('splits text around mentions', () => {
    expect(splitMentions('cc @Ada Lovelace and @Grace.', [ada, grace])).toEqual([
      { text: 'cc ' },
      { text: '@Ada Lovelace', person: ada },
      { text: ' and ' },
      { text: '@Grace', person: grace },
      { text: '.' },
    ])
    expect(splitMentions('no mentions', [])).toEqual([{ text: 'no mentions' }])
  })
})
