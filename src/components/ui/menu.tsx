import * as React from 'react'
import { DropdownMenu } from 'radix-ui'
import { cn } from '@/lib/utils'

export const Menu = DropdownMenu.Root
export const MenuTrigger = DropdownMenu.Trigger
export const MenuGroup = DropdownMenu.Group

/** Pop-up menu with the frosted macOS material. */
export function MenuContent({
  className,
  align = 'end',
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cn(
          'z-50 min-w-56 origin-(--radix-dropdown-menu-content-transform-origin) animate-scale-in rounded-[14px] p-1.5',
          'glass-strong shadow-popover',
          className,
        )}
        {...props}
      />
    </DropdownMenu.Portal>
  )
}

export function MenuItem({
  className,
  destructive,
  ...props
}: React.ComponentProps<typeof DropdownMenu.Item> & { destructive?: boolean }) {
  return (
    <DropdownMenu.Item
      className={cn(
        'flex h-9 cursor-default items-center gap-2.5 rounded-[9px] px-2.5 text-subhead outline-none select-none',
        '[&_svg]:size-4 [&_svg]:shrink-0',
        destructive
          ? 'text-down data-highlighted:bg-down data-highlighted:text-white'
          : 'text-label data-highlighted:bg-brand data-highlighted:text-on-brand [&_svg]:text-label-secondary data-highlighted:[&_svg]:text-on-brand',
        'data-disabled:opacity-40',
        className,
      )}
      {...props}
    />
  )
}

export function MenuLabel({ className, ...props }: React.ComponentProps<typeof DropdownMenu.Label>) {
  return <DropdownMenu.Label className={cn('px-2.5 pt-1 pb-1.5', className)} {...props} />
}

export function MenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenu.Separator>) {
  return <DropdownMenu.Separator className={cn('mx-2.5 my-1.5 h-px bg-separator', className)} {...props} />
}
