import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    title: string;
    description?: string;
    actions?: ReactNode;
    className?: string;
};

export function AdminPageHeader({ title, description, actions, className }: Props) {
    return (
        <div
            className={cn(
                'ops-fade-in flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
                className,
            )}
        >
            <div className="min-w-0 space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--ops-ink)] md:text-[1.75rem]">
                    {title}
                </h1>
                {description ? (
                    <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
                ) : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
    );
}
