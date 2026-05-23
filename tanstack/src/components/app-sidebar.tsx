import * as React from "react"
import { Link } from "@tanstack/react-router"
import {
  ChartBarIcon,
  CircleHelpIcon,
  DatabaseIcon,
  FileChartColumnIcon,
  FileIcon,
  FolderIcon,
  LayoutDashboardIcon,
  ListIcon,
  MessageSquare,
  SearchIcon,
  Settings2Icon,
  UsersIcon,
} from "lucide-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Guest",
    email: "sign in to continue",
    avatar: "",
  },
  navMain: [
    { title: "Feed", to: "/feed", icon: LayoutDashboardIcon },
    { title: "Threads", to: "/threads", icon: MessageSquare },
    { title: "Topics", to: "/topics", icon: ListIcon },
    { title: "Analytics", to: "/threads", icon: ChartBarIcon },
    { title: "Projects", to: "/topics", icon: FolderIcon },
    { title: "Team", to: "/feed", icon: UsersIcon },
  ],
  navSecondary: [
    { title: "Settings", to: "#", icon: Settings2Icon },
    { title: "Get Help", to: "#", icon: CircleHelpIcon },
    { title: "Search", to: "#", icon: SearchIcon },
  ],
  documents: [
    { name: "Data Library", to: "#", icon: DatabaseIcon },
    { name: "Reports", to: "#", icon: FileChartColumnIcon },
    { name: "Word Assistant", to: "#", icon: FileIcon },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link to="/feed" className="flex min-w-0 items-center gap-2">
                <img
                  src="/logo-dark.png"
                  alt="Refetch"
                  width={102}
                  height={23}
                  className="h-6 w-auto max-w-32 object-contain object-left group-data-[collapsible=icon]/sidebar-wrapper:hidden"
                />
                <img
                  src="/favicon.png"
                  alt="Refetch"
                  width={28}
                  height={28}
                  className="hidden size-7 shrink-0 object-contain group-data-[collapsible=icon]/sidebar-wrapper:block"
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
