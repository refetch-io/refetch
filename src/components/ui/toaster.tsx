import { Toaster as Sonner } from 'sonner'
import { useTheme } from '@/lib/theme'

/** Toasts styled as frosted notification banners. */
export function Toaster() {
  const { resolvedTheme } = useTheme()
  return (
    <Sonner
      theme={resolvedTheme}
      position="top-center"
      offset={72}
      mobileOffset={{ top: 64 }}
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            '!rounded-[18px] !border !border-glass-border !bg-glass-strong !backdrop-blur-xl !backdrop-saturate-[1.8] !shadow-popover !text-label !font-sans !px-4 !py-3 !gap-3',
          title: '!text-subhead !font-semibold',
          description: '!text-footnote !text-label-secondary',
          actionButton: '!rounded-full !bg-brand !text-on-brand !font-semibold',
          icon: '!text-brand-text',
        },
      }}
    />
  )
}
