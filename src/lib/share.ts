import { toast } from 'sonner'

/** Resolves to whether the text was copied. */
export async function copyToClipboard(text: string, message = 'Link copied') {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(message)
    return true
  } catch {
    toast.error('Couldn’t copy to the clipboard')
    return false
  }
}

/** Native share sheet where available, clipboard everywhere else. Resolves to how it was shared, or null. */
export async function shareLink(data: { title: string; url: string }): Promise<'native' | 'copy' | null> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(data)
      return 'native'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return null
    }
  }
  return (await copyToClipboard(data.url)) ? 'copy' : null
}
