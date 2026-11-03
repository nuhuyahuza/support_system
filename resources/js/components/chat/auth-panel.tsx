import type { ReactNode } from 'react';
import { usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';

type AuthScreenProps = {
    title?: string;
    description?: ReactNode;
    brandName?: string;
    beforePanel?: ReactNode;
    children: ReactNode;
};

export function AuthScreen({
    title,
    description,
    brandName: brandNameProp,
    beforePanel,
    children,
}: AuthScreenProps) {
    const pageBrand = usePage().props.brandName as string | undefined;
    const brandName = brandNameProp || pageBrand || 'Support';
    const showTitle = Boolean(title && title !== brandName);

    return (
        <div className="mx-auto flex h-full w-full max-w-md flex-col justify-center px-6">
            <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[var(--wa-accent)] text-2xl font-bold text-white">
                    {brandName.slice(0, 1).toUpperCase()}
                </div>
                <h1 className="text-2xl font-semibold">{brandName}</h1>
                {showTitle ? (
                    <p className="mt-2 text-base font-medium text-[var(--wa-fg)]">{title}</p>
                ) : null}
                {description ? (
                    <p className="mt-2 text-sm text-[var(--wa-muted)]">{description}</p>
                ) : null}
            </div>
            {beforePanel}
            {children}
        </div>
    );
}

type AuthFormPanelProps = {
    children: ReactNode;
    className?: string;
};

export function AuthFormPanel({ children, className }: AuthFormPanelProps) {
    return (
        <div className={cn('rounded-2xl bg-[var(--wa-panel)] p-6 shadow-lg', className)}>
            {children}
        </div>
    );
}
