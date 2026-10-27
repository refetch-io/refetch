import { describe, expect, it } from 'vitest'
import { escapeHtml, renderNotificationEmail } from './email'

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
      settingsUrl: 'https://refetch.io/notifications',
    })
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('href="https://refetch.io/threads/p1#comment-c1"')
    expect(html).toContain('href="https://refetch.io/notifications"')
  })

  it('leaves the quote out when there is none', () => {
    const html = renderNotificationEmail({
      headline: 'Grace started following you',
      url: 'https://refetch.io/u/u2',
      action: 'View profile',
      settingsUrl: 'https://refetch.io/notifications',
    })
    expect(html).not.toContain('border-left')
  })
})
