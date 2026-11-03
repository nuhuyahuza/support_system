import { Form, Head, Link, router } from '@inertiajs/react';
import { Search, Users } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type CustomerRow = {
    id: number;
    name: string;
    phone: string | null;
    is_active: boolean;
    is_online: boolean;
    last_seen_at: string | null;
    created_at: string | null;
    conversation: {
        id: number;
        status: string;
        ai_active: boolean;
        last_message_at: string | null;
        assigned_agent: { id: number; name: string } | null;
        latest_message: {
            body: string | null;
            sender_type: string;
            created_at: string | null;
        } | null;
    } | null;
};

type Paginated<T> = {
    data: T[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
};

type Props = {
    search: string;
    customers: Paginated<CustomerRow>;
};

export default function AdminCustomers({ search: initialSearch, customers }: Props) {
    const [search, setSearch] = useState(initialSearch);

    const onSearch = (event: FormEvent) => {
        event.preventDefault();
        router.get('/admin/customers', { search }, { preserveState: true, replace: true });
    };

    return (
        <>
            <Head title="Customers" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <AdminPageHeader
                    title="Customers"
                    description="Search customers, open their chats, and deactivate accounts."
                    actions={
                        <form onSubmit={onSearch} className="relative w-full sm:w-72">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search name or phone"
                                className="rounded-full border-border/70 bg-[var(--ops-surface)] pl-9 backdrop-blur"
                            />
                        </form>
                    }
                />

                <div className="ops-card ops-fade-in overflow-hidden">
                    <div className="border-b border-border/60 px-5 py-4">
                        <h2 className="text-base font-semibold text-[var(--ops-ink)]">Directory</h2>
                        <p className="text-sm text-muted-foreground">Phone-authenticated support users</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="bg-muted/40 text-muted-foreground">
                                <tr>
                                    <th className="px-5 py-3 font-medium">Customer</th>
                                    <th className="px-3 py-3 font-medium">Status</th>
                                    <th className="px-3 py-3 font-medium">Conversation</th>
                                    <th className="px-3 py-3 font-medium">Last message</th>
                                    <th className="px-5 py-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-16 text-center text-muted-foreground">
                                            <Users className="mx-auto mb-2 size-8 opacity-40" />
                                            No customers found.
                                        </td>
                                    </tr>
                                ) : (
                                    customers.data.map((customer) => (
                                        <tr
                                            key={customer.id}
                                            className="border-t border-border/50 transition hover:bg-[var(--ops-teal-soft)]/30"
                                        >
                                            <td className="px-5 py-3.5">
                                                <div className="font-medium text-[var(--ops-ink)]">{customer.name}</div>
                                                <div className="text-xs text-muted-foreground">{customer.phone}</div>
                                            </td>
                                            <td className="px-3 py-3.5">
                                                <div className="flex flex-wrap gap-1">
                                                    <Badge
                                                        className="rounded-full"
                                                        variant={customer.is_active ? 'secondary' : 'destructive'}
                                                    >
                                                        {customer.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                    {customer.is_online ? (
                                                        <Badge variant="outline" className="rounded-full">
                                                            Online
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3.5">
                                                {customer.conversation ? (
                                                    <div className="space-y-1">
                                                        <Badge variant="outline" className="rounded-full capitalize">
                                                            {customer.conversation.status}
                                                        </Badge>
                                                        {customer.conversation.assigned_agent ? (
                                                            <div className="text-xs text-muted-foreground">
                                                                {customer.conversation.assigned_agent.name}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="max-w-[220px] px-3 py-3.5">
                                                <p className="truncate text-muted-foreground">
                                                    {customer.conversation?.latest_message?.body || '—'}
                                                </p>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-wrap gap-2">
                                                    {customer.conversation ? (
                                                        <Button asChild size="sm" variant="outline" className="rounded-full">
                                                            <Link
                                                                href={`/admin/conversations?conversation=${customer.conversation.id}`}
                                                            >
                                                                Open chat
                                                            </Link>
                                                        </Button>
                                                    ) : null}
                                                    <Form
                                                        action={`/admin/customers/${customer.id}`}
                                                        method="put"
                                                        options={{ preserveScroll: true }}
                                                    >
                                                        <input
                                                            type="hidden"
                                                            name="is_active"
                                                            value={customer.is_active ? '0' : '1'}
                                                        />
                                                        <Button
                                                            size="sm"
                                                            variant={customer.is_active ? 'destructive' : 'default'}
                                                            type="submit"
                                                            className="rounded-full"
                                                        >
                                                            {customer.is_active ? 'Deactivate' : 'Activate'}
                                                        </Button>
                                                    </Form>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {customers.links.length > 3 ? (
                        <div className="flex flex-wrap gap-1 border-t border-border/60 p-3">
                            {customers.links.map((link, index) => (
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
