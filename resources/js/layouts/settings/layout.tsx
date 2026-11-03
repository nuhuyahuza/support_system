import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import ChatShell from '@/components/chat/chat-shell';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        href: edit(),
        icon: null,
    },
    {
        title: 'Security',
        href: editSecurity(),
        icon: null,
    },
    {
        title: 'Appearance',
        href: editAppearance(),
        icon: null,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <ChatShell>
            <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-y-auto px-4 py-8">
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">Account settings</h1>
                        <p className="text-sm text-[var(--wa-muted)]">
                            Manage your profile, security, and appearance
                        </p>
                    </div>
                    <Link href="/admin/chats" className="text-sm text-[var(--wa-accent)] underline">
                        Back to inbox
                    </Link>
                </div>

                <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
                    <aside className="w-full lg:w-48">
                        <nav
                            className="flex gap-1 overflow-x-auto rounded-2xl bg-[var(--wa-panel)] p-2 lg:flex-col"
                            aria-label="Settings"
                        >
                            {sidebarNavItems.map((item, index) => {
                                const active = isCurrentOrParentUrl(item.href);

                                return (
                                    <Link
                                        key={`${toUrl(item.href)}-${index}`}
                                        href={item.href}
                                        className={cn(
                                            'whitespace-nowrap rounded-xl px-3 py-2 text-sm transition-colors',
                                            active
                                                ? 'bg-[var(--wa-accent)] text-white'
                                                : 'text-[var(--wa-muted)] hover:bg-[var(--wa-hover)] hover:text-[var(--wa-fg)]',
                                        )}
                                    >
                                        {item.title}
                                    </Link>
                                );
                            })}
                        </nav>
                    </aside>

                    <section className="min-w-0 flex-1 space-y-6 rounded-2xl bg-[var(--wa-panel)] p-6 shadow-lg">
                        {children}
                    </section>
                </div>
            </div>
        </ChatShell>
    );
}
