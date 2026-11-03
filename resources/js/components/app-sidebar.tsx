import { Link, usePage } from '@inertiajs/react';
import {
    Headphones,
    LayoutDashboard,
    MessageSquare,
    Settings,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { isAdmin } = usePage().props;

    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: '/admin/dashboard',
            icon: LayoutDashboard,
        },
        {
            title: 'Conversations',
            href: '/admin/conversations',
            icon: MessageSquare,
        },
        ...(isAdmin
            ? [
                  {
                      title: 'Customers',
                      href: '/admin/customers',
                      icon: Users,
                  } satisfies NavItem,
                  {
                      title: 'Agents',
                      href: '/admin/agents',
                      icon: Headphones,
                  } satisfies NavItem,
                  {
                      title: 'Settings',
                      href: '/admin/settings',
                      icon: Settings,
                  } satisfies NavItem,
              ]
            : []),
    ];

    return (
        <Sidebar collapsible="icon" variant="inset" className="border-none">
            <SidebarHeader className="px-3 pt-3">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="rounded-2xl bg-sidebar-accent/60 hover:bg-sidebar-accent"
                        >
                            <Link href="/admin/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <p className="px-2 pt-3 text-[10px] font-semibold tracking-[0.18em] text-sidebar-foreground/45 uppercase group-data-[collapsible=icon]:hidden">
                    Operations
                </p>
            </SidebarHeader>

            <SidebarContent className="px-1">
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border/60 p-3">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
