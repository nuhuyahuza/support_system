import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

export function NavMain({ items }: { items: NavItem[] }) {
    const { isCurrentUrl, isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarMenu className="gap-1">
                {items.map((item) => {
                    const active =
                        item.href === '/admin/dashboard'
                            ? isCurrentUrl(item.href)
                            : isCurrentUrl(item.href) || isCurrentOrParentUrl(item.href);

                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={active}
                                tooltip={{ children: item.title }}
                                className="rounded-xl data-[active=true]:bg-[var(--ops-teal,oklch(0.58_0.12_190))] data-[active=true]:font-medium data-[active=true]:text-white data-[active=true]:shadow-sm data-[active=true]:hover:bg-[var(--ops-teal,oklch(0.58_0.12_190))] data-[active=true]:hover:text-white [&_svg]:text-current"
                            >
                                <Link href={item.href} prefetch>
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
