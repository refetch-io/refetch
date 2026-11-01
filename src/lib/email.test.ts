import { describe, expect, it } from 'vitest'
import { digestSubject, escapeHtml, renderDigestEmail, renderNotificationEmail } from './email'

describe('escapeHtml', () => {
  it('escapes markup and quotes', () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;',
    )
  })
})

describe('renderNotificationEmail', () => {
  it('escapes user content and links to the settings page', () => {
    const html = renderNotificationEmail({
      headline: 'Mallory replied to your comment',
      quote: '<img src=x onerror=alert(1)>',
      url: 'https://refetch.io/threads/p1#comment-c1',
      action: 'Open the discussion',
      settingsUrl: 'https://refetch.io/settings#email',
      unsubscribeUrl: 'https://refetch.io/email/unsubscribe?u=u1&l=activity&t=sig',
    })
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('href="https://refetch.io/threads/p1#comment-c1"')
    expect(html).toContain('href="https://refetch.io/settings#email"')
    expect(html).toContain('href="https://refetch.io/email/unsubscribe?u=u1&amp;l=activity&amp;t=sig"')
    expect(html).toContain('>Unsubscribe</a>')
  })

  it('leaves the quote out when there is none', () => {
    const html = renderNotificationEmail({
      headline: 'Grace started following you',
      url: 'https://refetch.io/u/u2',
      action: 'View profile',
      settingsUrl: 'https://refetch.io/settings#email',
      unsubscribeUrl: 'https://refetch.io/email/unsubscribe',
    })
    expect(html).not.toContain('border-left')
  })
})

describe('renderDigestEmail', () => {
  const story = (title: string) => ({
    title,
    threadUrl: 'https://refetch.io/threads/p1',
    articleUrl: 'https://example.com/a',
    domain: 'example.com',
    summary: 'A <b>summary</b>',
    points: 1,
    comments: 2,
  })
  const base = {
    dateLabel: 'Monday, November 2',
    siteUrl: 'https://refetch.io',
    settingsUrl: 'https://refetch.io/settings#email',
    unsubscribeUrl: 'https://refetch.io/email/unsubscribe?u=u1&l=digest&t=sig',
    switchUrl: 'https://refetch.io/email/unsubscribe?u=u1&l=digest&t=sig&switch=daily',
  }

  it('lists both sections, escapes content and offers unsubscribe and switching', () => {
    const html = renderDigestEmail({
      ...base,
      frequency: 'weekly',
      forYou: [story('Rust <2.0>')],
      top: [story('Top one'), story('Top two')],
    })
    expect(html).toContain('For you')
    expect(html).toContain('Top stories')
    expect(html).toContain('Rust &lt;2.0&gt;')
    expect(html).toContain('A &lt;b&gt;summary&lt;/b&gt;')
    expect(html).toContain('1 point')
    expect(html).toContain('2 comments')
    expect(html).toContain('>Unsubscribe</a>')
    expect(html).toContain('>Switch to daily</a>')
    // Ranks continue across sections.
    expect(html).toMatch(/>3<\/span><a [^>]*>Top two</)
  })

  it('leaves out an empty For you section', () => {
    const html = renderDigestEmail({ ...base, frequency: 'daily', forYou: [], top: [story('Only')] })
    expect(html).not.toContain('For you')
    expect(html).toContain('Today’s top stories')
    expect(html).toContain('>Switch to weekly</a>')
  })

  it('names the lead story in the subject', () => {
    expect(digestSubject({ frequency: 'daily', forYou: [], top: [story('Big news')] })).toBe(
      'Today on Refetch: Big news',
    )
    expect(digestSubject({ frequency: 'weekly', forYou: [story('Mine')], top: [] })).toBe(
      'This week on Refetch: Mine',
    )
  })
})
