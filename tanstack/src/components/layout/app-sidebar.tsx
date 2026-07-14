import { Link, useRouterState } from '@tanstack/react-router'
import { ArrowLeft, Braces } from 'lucide-react'
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
  DOCS_NAV,
  WORKSPACE_NAV,
  isDocsPath,
  isNavActive,
  type AppNavItem,
  type ChannelNavItem,
  type DocsNavItem,
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

function DocsNavLink({ item }: { item: DocsNavItem }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isNavActive(pathname, item.to)}
        tooltip={item.label}
      >
        <Link to={item.to}>
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
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const docs = isDocsPath(pathname)

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
        {docs ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Documentation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {DOCS_NAV.map((item) => (
                    <DocsNavLink key={item.to} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Resources</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="OpenAPI spec">
                      <a href="/openapi.json" download>
                        <Braces />
                        <span>OpenAPI spec</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Back to feed">
                      <Link to="/">
                        <ArrowLeft />
                        <span>Back to feed</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <>
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
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  )
}
