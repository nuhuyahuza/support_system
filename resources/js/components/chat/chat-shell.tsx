import { ReactNode, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { Moon, Sun } from 'lucide-react';
import { useAppearance } from '@/hooks/use-appearance';
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
    const { resolvedAppearance, updateAppearance } = useAppearance();
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
        <div className={cn('wa-app flex h-dvh w-full overflow-hidden bg-[var(--wa-app-bg)] text-[var(--wa-fg)]', className)}>
            <button
                type="button"
                onClick={() => updateAppearance(resolvedAppearance === 'dark' ? 'light' : 'dark')}
                className="fixed right-4 top-4 z-50 flex size-9 items-center justify-center rounded-full bg-[var(--wa-panel)] text-[var(--wa-icon)] shadow-md"
                aria-label="Toggle theme"
            >
                {resolvedAppearance === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            {children}
        </div>
    );
}
