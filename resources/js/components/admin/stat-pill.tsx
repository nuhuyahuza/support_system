import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    label: string;
    value: ReactNode;
    tone?: 'default' | 'teal' | 'warn' | 'muted';
    className?: string;
};

const tones = {
    default: 'border-border/70 bg-white/70 text-foreground dark:bg-white/5',
    teal: 'border-[var(--ops-teal)]/25 bg-[var(--ops-teal-soft)] text-[var(--ops-ink)]',
    warn: 'border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-100',
    muted: 'border-border/60 bg-muted/60 text-muted-foreground',
};

export function StatPill({ label, value, tone = 'default', className }: Props) {
    return (
        <div
            className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-sm',
                tones[tone],
                className,
            )}
        >
            <span className="opacity-70">{label}</span>
            <span className="tabular-nums font-semibold">{value}</span>
        </div>
    );
}
