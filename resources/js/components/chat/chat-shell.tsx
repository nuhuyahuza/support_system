import { ReactNode, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';

type Props = {
    children: ReactNode;
    className?: string;
};

function csrfToken(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}

function pingPresence(online: boolean) {
    void fetch('/presence', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
        },
        body: JSON.stringify({ online }),
        keepalive: true,
    });
}

export default function ChatShell({ children, className }: Props) {
    const user = usePage().props.auth?.user;

    useEffect(() => {
        if (!user) {
            return;
        }

        pingPresence(true);

        const onLeave = () => pingPresence(false);
        window.addEventListener('pagehide', onLeave);

        return () => {
            window.removeEventListener('pagehide', onLeave);
            pingPresence(false);
        };
    }, [user]);

    return (
        <div
            className={cn(
                'wa-app flex h-dvh w-full overflow-hidden bg-[var(--wa-app-bg)] text-[var(--wa-fg)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
                className,
            )}
        >
            {children}
        </div>
    );
}
