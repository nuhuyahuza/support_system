import { Form, Head, Link, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
                        <p className="text-sm text-muted-foreground">
                            Search customers, open their chats, and deactivate accounts.
                        </p>
                    </div>
                    <form onSubmit={onSearch} className="relative w-full sm:max-w-sm">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search name or phone"
                            className="pl-9"
                        />
                    </form>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Directory</CardTitle>
                        <CardDescription>Phone-authenticated support users</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead className="border-b text-muted-foreground">
                                <tr>
                                    <th className="px-2 py-2 font-medium">Customer</th>
                                    <th className="px-2 py-2 font-medium">Status</th>
                                    <th className="px-2 py-2 font-medium">Conversation</th>
                                    <th className="px-2 py-2 font-medium">Last message</th>
                                    <th className="px-2 py-2 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-2 py-8 text-muted-foreground">
                                            No customers found.
                                        </td>
                                    </tr>
                                ) : (
                                    customers.data.map((customer) => (
                                        <tr key={customer.id} className="border-b last:border-0">
                                            <td className="px-2 py-3">
                                                <div className="font-medium">{customer.name}</div>
                                                <div className="text-xs text-muted-foreground">{customer.phone}</div>
                                            </td>
                                            <td className="px-2 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    <Badge variant={customer.is_active ? 'secondary' : 'destructive'}>
                                                        {customer.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                    {customer.is_online ? <Badge variant="outline">Online</Badge> : null}
                                                </div>
                                            </td>
                                            <td className="px-2 py-3">
                                                {customer.conversation ? (
                                                    <div className="space-y-1">
                                                        <Badge variant="outline" className="capitalize">
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
                                            <td className="max-w-[220px] px-2 py-3">
                                                <p className="truncate text-muted-foreground">
                                                    {customer.conversation?.latest_message?.body || '—'}
                                                </p>
                                            </td>
                                            <td className="px-2 py-3">
                                                <div className="flex flex-wrap gap-2">
                                                    {customer.conversation ? (
                                                        <Button asChild size="sm" variant="outline">
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

                        {customers.links.length > 3 ? (
                            <div className="mt-4 flex flex-wrap gap-1">
                                {customers.links.map((link, index) => (
                                    <Button
                                        key={`${link.label}-${index}`}
                                        size="sm"
                                        variant={link.active ? 'default' : 'ghost'}
                                        disabled={!link.url}
                                        onClick={() => link.url && router.visit(link.url)}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
