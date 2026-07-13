import { Link, useRouterState } from '@tanstack/react-router'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { RefetchMark, RefetchWordmark } from '@/components/refetch-logo'
import { UserMenu } from '@/components/layout/user-menu'
import { useAuth } from '@/contexts/auth-context'
import {
  CHANNELS_NAV,
  DISCOVER_NAV,
  WORKSPACE_NAV,
  isNavActive,
  type AppNavItem,
  type ChannelNavItem,
} from '@/components/layout/nav-config'

function NavLink({ item }: { item: AppNavItem }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { isAuthenticated } = useAuth()
  const href =
    item.auth && !isAuthenticated ? '/signin' : (item.to as AppNavItem['to'])

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isNavActive(pathname, item.to)}
        tooltip={item.label}
      >
        <Link to={href}>
          <item.icon />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function ChannelLink({ item }: { item: ChannelNavItem }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={item.label}
        className="text-sidebar-foreground/90"
      >
        <item.icon />
        <span>{item.label}</span>
      </SidebarMenuButton>
      <SidebarMenuBadge className="border-0 bg-transparent text-[10px] font-normal text-muted-foreground peer-hover/menu-button:text-muted-foreground peer-data-active/menu-button:text-muted-foreground">
        Soon
      </SidebarMenuBadge>
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border">
        <Link
          to="/"
          aria-label="Refetch home"
          className="flex h-8 items-center overflow-hidden rounded-md px-2 outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent focus-visible:ring-2 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
        >
          <RefetchMark className="hidden size-5 shrink-0 group-data-[collapsible=icon]:block" />
          <RefetchWordmark className="h-5 w-[90px] shrink-0 group-data-[collapsible=icon]:hidden" />
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-3">
        <SidebarGroup>
          <SidebarGroupLabel>Discover</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {DISCOVER_NAV.map((item) => (
                <NavLink key={item.to} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {WORKSPACE_NAV.map((item) => (
                <NavLink key={item.to} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Channels</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {CHANNELS_NAV.map((item) => (
                <ChannelLink key={item.id} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  )
}
