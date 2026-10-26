import { toast } from 'sonner'

export async function copyToClipboard(text: string, message = 'Link copied') {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(message)
  } catch {
    toast.error('Couldn’t copy to the clipboard')
  }
}

/** Native share sheet where available, clipboard everywhere else. */
export async function shareLink(data: { title: string; url: string }) {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(data)
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
  }
  await copyToClipboard(data.url)
}
