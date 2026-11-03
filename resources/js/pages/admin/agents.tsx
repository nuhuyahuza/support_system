import { Form, Head, router, usePage } from '@inertiajs/react';
import { Headphones, Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
                <AdminPageHeader
                    title="Agents"
                    description="Create support staff, change roles, reset passwords, and deactivate accounts."
                    actions={
                        <form onSubmit={onSearch} className="relative w-full sm:w-72">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search name or email"
                                className="rounded-full border-border/70 bg-[var(--ops-surface)] pl-9 backdrop-blur"
                            />
                        </form>
                    }
                />

                <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                    <div className="ops-card ops-fade-in p-5">
                        <div className="mb-4">
                            <h2 className="text-base font-semibold text-[var(--ops-ink)]">Add staff</h2>
                            <p className="text-sm text-muted-foreground">Invite an agent or admin</p>
                        </div>
                        <Form action="/admin/agents" method="post" className="space-y-4" options={{ preserveScroll: true }}>
                            {({ processing, errors }) => (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input id="name" name="name" className="rounded-xl" required />
                                        <InputError message={errors.name} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" name="email" type="email" className="rounded-xl" required />
                                        <InputError message={errors.email} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="role">Role</Label>
                                        <select
                                            id="role"
                                            name="role"
                                            defaultValue="agent"
                                            className="h-9 w-full rounded-xl border border-border/70 bg-background px-3 text-sm"
                                        >
                                            <option value="agent">Agent</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                        <InputError message={errors.role} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Password</Label>
                                        <Input id="password" name="password" type="password" className="rounded-xl" required />
                                        <InputError message={errors.password} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password_confirmation">Confirm password</Label>
                                        <Input
                                            id="password_confirmation"
                                            name="password_confirmation"
                                            type="password"
                                            className="rounded-xl"
                                            required
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full rounded-xl bg-[var(--ops-teal)] hover:brightness-105"
                                    >
                                        {processing ? <Spinner /> : null}
                                        Create staff member
                                    </Button>
                                </>
                            )}
                        </Form>
                    </div>

                    <div className="ops-card ops-fade-in p-5">
                        <div className="mb-4">
                            <h2 className="text-base font-semibold text-[var(--ops-ink)]">Team</h2>
                            <p className="text-sm text-muted-foreground">Admins and agents</p>
                        </div>
                        <div className="space-y-3">
                            {agents.data.length === 0 ? (
                                <div className="py-12 text-center text-sm text-muted-foreground">
                                    <Headphones className="mx-auto mb-2 size-8 opacity-40" />
                                    No staff members found.
                                </div>
                            ) : (
                                agents.data.map((agent) => {
                                    const isSelf = agent.id === currentUserId;
                                    const isEditing = editingId === agent.id;

                                    return (
                                        <div
                                            key={agent.id}
                                            className="rounded-2xl border border-border/60 bg-background/50 p-4 transition hover:border-[var(--ops-teal)]/30"
                                        >
                                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-medium text-[var(--ops-ink)]">{agent.name}</p>
                                                        <Badge variant="outline" className="rounded-full capitalize">
                                                            {agent.role}
                                                        </Badge>
                                                        <Badge
                                                            className="rounded-full"
                                                            variant={agent.is_active ? 'secondary' : 'destructive'}
                                                        >
                                                            {agent.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                        {agent.is_online ? (
                                                            <Badge variant="outline" className="rounded-full">
                                                                Online
                                                            </Badge>
                                                        ) : null}
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
                                                        className="rounded-full"
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
                                                                className="rounded-full"
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
                                                                    className="rounded-xl"
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
                                                                    className="rounded-xl"
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
                                                                    className="h-9 w-full rounded-xl border border-border/70 bg-background px-3 text-sm"
                                                                >
                                                                    <option value="agent">Agent</option>
                                                                    <option value="admin">Admin</option>
                                                                </select>
                                                                <InputError message={errors.role} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor={`password-${agent.id}`}>New password</Label>
                                                                <Input
                                                                    id={`password-${agent.id}`}
                                                                    name="password"
                                                                    type="password"
                                                                    placeholder="Leave blank to keep"
                                                                    className="rounded-xl"
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
                                                                    className="rounded-xl"
                                                                />
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <Button
                                                                    type="submit"
                                                                    disabled={processing}
                                                                    className="rounded-xl bg-[var(--ops-teal)] hover:brightness-105"
                                                                >
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
                        </div>

                        {agents.links.length > 3 ? (
                            <div className="mt-4 flex flex-wrap gap-1">
                                {agents.links.map((link, index) => (
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
            </div>
        </>
    );
}
