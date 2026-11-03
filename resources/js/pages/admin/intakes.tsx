import { Head, Link, router } from '@inertiajs/react';
import { ClipboardList, Download, Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type IntakeRow = {
    id: number;
    phone: string;
    data_size: number;
    issue: string | null;
    created_at: string | null;
    conversation_id: number;
    customer: {
        id: number;
        name: string;
        phone: string | null;
    } | null;
};

type Paginated<T> = {
    data: T[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
};

type Props = {
    search: string;
    intakes: Paginated<IntakeRow>;
};

export default function AdminIntakes({ search: initialSearch, intakes }: Props) {
    const [search, setSearch] = useState(initialSearch);

    const onSearch = (event: FormEvent) => {
        event.preventDefault();
        router.get('/admin/intakes', { search }, { preserveState: true, replace: true });
    };

    const exportUrl = search
        ? `/admin/intakes/export?search=${encodeURIComponent(search)}`
        : '/admin/intakes/export';

    return (
        <>
            <Head title="Intakes" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <AdminPageHeader
                    title="Intakes"
                    description="Reported phone numbers, data sizes, and main issues collected before agent or AI handoff."
                    actions={
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                            <form onSubmit={onSearch} className="relative w-full sm:w-72">
                                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search phone, issue, or customer"
                                    className="rounded-full border-border/70 bg-[var(--ops-surface)] pl-9 backdrop-blur"
                                />
                            </form>
                            <Button asChild variant="outline" className="rounded-full">
                                <a href={exportUrl}>
                                    <Download className="size-4" />
                                    Export CSV
                                </a>
                            </Button>
                        </div>
                    }
                />

                <div className="ops-card ops-fade-in overflow-hidden">
                    <div className="border-b border-border/60 px-5 py-4">
                        <h2 className="text-base font-semibold text-[var(--ops-ink)]">Collected details</h2>
                        <p className="text-sm text-muted-foreground">
                            Each row links back to the conversation where it was submitted
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[860px] text-left text-sm">
                            <thead className="bg-muted/40 text-muted-foreground">
                                <tr>
                                    <th className="px-5 py-3 font-medium">Phone</th>
                                    <th className="px-3 py-3 font-medium">Data size</th>
                                    <th className="px-3 py-3 font-medium">Main issue</th>
                                    <th className="px-3 py-3 font-medium">Customer</th>
                                    <th className="px-3 py-3 font-medium">Submitted</th>
                                    <th className="px-5 py-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {intakes.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-16 text-center text-muted-foreground">
                                            <ClipboardList className="mx-auto mb-2 size-8 opacity-40" />
                                            No intakes found.
                                        </td>
                                    </tr>
                                ) : (
                                    intakes.data.map((intake) => (
                                        <tr
                                            key={intake.id}
                                            className="border-t border-border/50 transition hover:bg-[var(--ops-teal-soft)]/30"
                                        >
                                            <td className="px-5 py-3.5 font-medium text-[var(--ops-ink)]">
                                                {intake.phone}
                                            </td>
                                            <td className="px-3 py-3.5">{intake.data_size} GB</td>
                                            <td className="max-w-[240px] px-3 py-3.5 text-[var(--ops-ink)]">
                                                <p className="line-clamp-2">{intake.issue || '—'}</p>
                                            </td>
                                            <td className="px-3 py-3.5">
                                                {intake.customer ? (
                                                    <div>
                                                        <div className="font-medium text-[var(--ops-ink)]">
                                                            {intake.customer.name}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {intake.customer.phone}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3.5 text-muted-foreground">
                                                {intake.created_at
                                                    ? new Date(intake.created_at).toLocaleString()
                                                    : '—'}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <Button asChild size="sm" variant="outline" className="rounded-full">
                                                    <Link
                                                        href={`/admin/conversations?conversation=${intake.conversation_id}`}
                                                    >
                                                        View conversation
                                                    </Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {intakes.links.length > 3 ? (
                        <div className="flex flex-wrap gap-1 border-t border-border/60 p-3">
                            {intakes.links.map((link, index) => (
                                <Button
                                    key={`${link.label}-${index}`}
                                    size="sm"
                                    variant={link.active ? 'default' : 'ghost'}
                                    disabled={!link.url}
                                    className="rounded-full"
                                    onClick={() => link.url && router.visit(link.url)}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        </>
    );
}
