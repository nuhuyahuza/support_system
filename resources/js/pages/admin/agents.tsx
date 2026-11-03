import { Form, Head, router, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type AgentRow = {
    id: number;
    name: string;
    email: string | null;
    role: string;
    is_active: boolean;
    is_online: boolean;
    last_seen_at: string | null;
    open_assigned: number;
    created_at: string | null;
};

type Paginated<T> = {
    data: T[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
};

type Props = {
    search: string;
    agents: Paginated<AgentRow>;
};

export default function AdminAgents({ search: initialSearch, agents }: Props) {
    const page = usePage();
    const currentUserId = page.props.auth.user?.id;
    const [search, setSearch] = useState(initialSearch);
    const [editingId, setEditingId] = useState<number | null>(null);

    const onSearch = (event: FormEvent) => {
        event.preventDefault();
        router.get('/admin/agents', { search }, { preserveState: true, replace: true });
    };

    return (
        <>
            <Head title="Agents" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
                        <p className="text-sm text-muted-foreground">
                            Create support staff, change roles, reset passwords, and deactivate accounts.
                        </p>
                    </div>
                    <form onSubmit={onSearch} className="relative w-full sm:max-w-sm">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search name or email"
                            className="pl-9"
                        />
                    </form>
                </div>

                <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Add staff</CardTitle>
                            <CardDescription>Invite an agent or admin</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form action="/admin/agents" method="post" className="space-y-4" options={{ preserveScroll: true }}>
                                {({ processing, errors }) => (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Name</Label>
                                            <Input id="name" name="name" required />
                                            <InputError message={errors.name} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input id="email" name="email" type="email" required />
                                            <InputError message={errors.email} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="role">Role</Label>
                                            <select
                                                id="role"
                                                name="role"
                                                defaultValue="agent"
                                                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                                            >
                                                <option value="agent">Agent</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                            <InputError message={errors.role} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Password</Label>
                                            <Input id="password" name="password" type="password" required />
                                            <InputError message={errors.password} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password_confirmation">Confirm password</Label>
                                            <Input
                                                id="password_confirmation"
                                                name="password_confirmation"
                                                type="password"
                                                required
                                            />
                                        </div>
                                        <Button type="submit" disabled={processing} className="w-full">
                                            {processing ? <Spinner /> : null}
                                            Create staff member
                                        </Button>
                                    </>
                                )}
                            </Form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Team</CardTitle>
                            <CardDescription>Admins and agents</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {agents.data.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No staff members found.</p>
                            ) : (
                                agents.data.map((agent) => {
                                    const isSelf = agent.id === currentUserId;
                                    const isEditing = editingId === agent.id;

                                    return (
                                        <div key={agent.id} className="rounded-xl border p-4">
                                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-medium">{agent.name}</p>
                                                        <Badge variant="outline" className="capitalize">
                                                            {agent.role}
                                                        </Badge>
                                                        <Badge variant={agent.is_active ? 'secondary' : 'destructive'}>
                                                            {agent.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                        {agent.is_online ? <Badge variant="outline">Online</Badge> : null}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{agent.email}</p>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        Open assigned: {agent.open_assigned}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        type="button"
                                                        onClick={() => setEditingId(isEditing ? null : agent.id)}
                                                    >
                                                        {isEditing ? 'Cancel' : 'Edit'}
                                                    </Button>
                                                    {!isSelf ? (
                                                        <Form
                                                            action={`/admin/agents/${agent.id}`}
                                                            method="put"
                                                            options={{ preserveScroll: true }}
                                                        >
                                                            <input
                                                                type="hidden"
                                                                name="is_active"
                                                                value={agent.is_active ? '0' : '1'}
                                                            />
                                                            <Button
                                                                size="sm"
                                                                variant={agent.is_active ? 'destructive' : 'default'}
                                                                type="submit"
                                                            >
                                                                {agent.is_active ? 'Deactivate' : 'Activate'}
                                                            </Button>
                                                        </Form>
                                                    ) : null}
                                                </div>
                                            </div>

                                            {isEditing ? (
                                                <Form
                                                    action={`/admin/agents/${agent.id}`}
                                                    method="put"
                                                    className="mt-4 grid gap-3 md:grid-cols-2"
                                                    options={{ preserveScroll: true }}
                                                    onSuccess={() => setEditingId(null)}
                                                >
                                                    {({ processing, errors }) => (
                                                        <>
                                                            <div className="space-y-2">
                                                                <Label htmlFor={`name-${agent.id}`}>Name</Label>
                                                                <Input
                                                                    id={`name-${agent.id}`}
                                                                    name="name"
                                                                    defaultValue={agent.name}
                                                                    required
                                                                />
                                                                <InputError message={errors.name} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor={`email-${agent.id}`}>Email</Label>
                                                                <Input
                                                                    id={`email-${agent.id}`}
                                                                    name="email"
                                                                    type="email"
                                                                    defaultValue={agent.email ?? ''}
                                                                    required
                                                                />
                                                                <InputError message={errors.email} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor={`role-${agent.id}`}>Role</Label>
                                                                <select
                                                                    id={`role-${agent.id}`}
                                                                    name="role"
                                                                    defaultValue={agent.role}
                                                                    disabled={isSelf}
                                                                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                                                                >
                                                                    <option value="agent">Agent</option>
                                                                    <option value="admin">Admin</option>
                                                                </select>
                                                                <InputError message={errors.role} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor={`password-${agent.id}`}>
                                                                    New password
                                                                </Label>
                                                                <Input
                                                                    id={`password-${agent.id}`}
                                                                    name="password"
                                                                    type="password"
                                                                    placeholder="Leave blank to keep"
                                                                />
                                                                <InputError message={errors.password} />
                                                            </div>
                                                            <div className="space-y-2 md:col-span-2">
                                                                <Label htmlFor={`password_confirmation-${agent.id}`}>
                                                                    Confirm password
                                                                </Label>
                                                                <Input
                                                                    id={`password_confirmation-${agent.id}`}
                                                                    name="password_confirmation"
                                                                    type="password"
                                                                />
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <Button type="submit" disabled={processing}>
                                                                    {processing ? <Spinner /> : null}
                                                                    Save changes
                                                                </Button>
                                                            </div>
                                                        </>
                                                    )}
                                                </Form>
                                            ) : null}
                                        </div>
                                    );
                                })
                            )}

                            {agents.links.length > 3 ? (
                                <div className="flex flex-wrap gap-1">
                                    {agents.links.map((link, index) => (
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
            </div>
        </>
    );
}
