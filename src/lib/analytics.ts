type PlausibleFn = (event: string, options?: { props?: Record<string, string | number | boolean> }) => void

function plausible(): PlausibleFn | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { plausible?: PlausibleFn }).plausible
}

/** Same event names as before, so existing Plausible goals keep working. */
export function trackPostClick(postId: string, postTitle: string, isExternal: boolean) {
  plausible()?.(isExternal ? 'main.posts.ExternalClick' : 'main.posts.InternalClick', {
    props: {
      post_id: postId,
      post_title: postTitle,
      post_type: isExternal ? 'external' : 'internal',
    },
  })
}

export function trackEvent(name: string, props?: Record<string, string | number | boolean>) {
  plausible()?.(name, props ? { props } : undefined)
}
