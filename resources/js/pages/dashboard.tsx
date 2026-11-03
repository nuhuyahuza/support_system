import { Head, Link } from '@inertiajs/react';

export default function Dashboard() {
    return (
        <>
            <Head title="Dashboard" />
            <div className="mx-auto flex h-full w-full max-w-3xl flex-col justify-center px-6">
                <div className="rounded-2xl bg-[var(--wa-panel)] p-8 shadow-lg">
                    <h1 className="text-2xl font-semibold">Dashboard</h1>
                    <p className="mt-2 text-sm text-[var(--wa-muted)]">
                        Staff workspace entry point. Open the support inbox to manage conversations.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                            href="/admin/chats"
                            className="inline-flex items-center justify-center rounded-lg bg-[var(--wa-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--wa-accent-strong)]"
                        >
                            Open inbox
                        </Link>
                        <Link
                            href="/settings/profile"
                            className="inline-flex items-center justify-center rounded-lg bg-[var(--wa-input)] px-4 py-2 text-sm font-medium text-[var(--wa-fg)] hover:bg-[var(--wa-hover)]"
                        >
                            Account settings
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
