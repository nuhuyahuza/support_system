import { usePage } from '@inertiajs/react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { cn } from '@/lib/utils';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const { component } = usePage();
    const isConversations = component === 'admin/conversations';

    return (
        <div className="ops-admin min-h-svh">
            <AppShell variant="sidebar">
                <AppSidebar />
                <AppContent
                    variant="sidebar"
                    className={cn(
                        'min-w-0 overflow-x-clip bg-transparent shadow-none',
                        isConversations &&
                            'h-[calc(100svh-1rem)] max-h-[calc(100svh-1rem)] min-h-0 overflow-hidden md:rounded-2xl md:border md:border-border/50 md:bg-[var(--ops-surface)] md:shadow-sm',
                    )}
                >
                    {!isConversations ? <AppSidebarHeader breadcrumbs={breadcrumbs} /> : null}
                    <div
                        className={cn(
                            'flex min-h-0 flex-1 flex-col',
                            isConversations && 'h-full overflow-hidden',
                        )}
                    >
                        {children}
                    </div>
                </AppContent>
            </AppShell>
        </div>
    );
}
