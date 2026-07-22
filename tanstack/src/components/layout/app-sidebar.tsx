import { Link, useRouterState } from '@tanstack/react-router'
import { ArrowLeft, Braces, ChevronLeft, ChevronRight } from 'lucide-react'
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
  useSidebar,
} from '@/components/ui/sidebar'
import { UserMenu } from '@/components/layout/user-menu'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
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
import type { AccountPreview } from '@/lib/auth-cookie'

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

/** Arrow control centered on the sidebar’s right border (desktop only). */
function SidebarBorderToggle() {
  const { state, toggleSidebar, isMobile } = useSidebar()
  if (isMobile) return null

  const collapsed = state === 'collapsed'

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className={cn(
        'absolute top-1/2 right-0 z-20 hidden size-6 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full',
        'border border-sidebar-border bg-background text-muted-foreground shadow-sm',
        'transition-[color,background-color,box-shadow] hover:bg-muted hover:text-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        'md:flex',
      )}
    >
      {collapsed ? (
        <ChevronRight className="size-3.5" />
      ) : (
        <ChevronLeft className="size-3.5" />
      )}
    </button>
  )
}

export function AppSidebar({
  defaultSignedIn = false,
  defaultAccount = null,
}: {
  defaultSignedIn?: boolean
  defaultAccount?: AccountPreview | null
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const docs = isDocsPath(pathname)

  return (
    <Sidebar collapsible="icon">
      {/* Spacer under the full-width shell header (desktop fixed sidebar only). */}
      <SidebarHeader className="hidden h-14 shrink-0 p-0 md:flex" />

      <SidebarBorderToggle />

      <SidebarContent className="gap-3">
        {docs ? (
          <>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
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
        <UserMenu
          defaultSignedIn={defaultSignedIn}
          defaultAccount={defaultAccount}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
