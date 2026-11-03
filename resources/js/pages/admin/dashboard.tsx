import { Head, Link, router } from '@inertiajs/react';
import {
    Bot,
    CircleDot,
    Clock3,
    MessageSquareWarning,
    Users,
    UserCheck,
} from 'lucide-react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SeriesPoint = { date: string; label: string; total: number };

type Props = {
    days: number;
    kpis: {
        open: number;
        waiting: number;
        closed_today: number;
        agents_online: number;
        ai_sessions: number;
        customers_total: number;
    };
    series: {
        conversations: SeriesPoint[];
        messages: SeriesPoint[];
    };
    messagesBySender: Array<{ type: string; total: number }>;
    statusBreakdown: { open: number; closed: number };
    agentWorkload: Array<{
        id: number;
        name: string;
        role: string;
        is_online: boolean;
        open_assigned: number;
    }>;
    waitingChats: Array<{
        id: number;
        customer: { id: number | null; name: string | null; phone: string | null };
        latest_message: { body: string | null; created_at: string | null } | null;
        last_message_at: string | null;
    }>;
};

const chartColors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];

function KpiCard({
    title,
    value,
    icon: Icon,
    hint,
    tone = 'teal',
}: {
    title: string;
    value: number;
    icon: typeof CircleDot;
    hint?: string;
    tone?: 'teal' | 'ink' | 'amber' | 'slate';
}) {
    const tones = {
        teal: 'from-[var(--ops-teal)]/20 to-transparent text-[var(--ops-teal)]',
        ink: 'from-[var(--ops-ink)]/15 to-transparent text-[var(--ops-ink)]',
        amber: 'from-amber-400/25 to-transparent text-amber-700 dark:text-amber-300',
        slate: 'from-slate-400/20 to-transparent text-slate-600 dark:text-slate-300',
    };

    return (
        <div className="ops-card ops-fade-in group relative overflow-hidden p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-28px_rgba(15,23,42,0.45)]">
            <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80', tones[tone])} />
            <div className="relative flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ops-ink)]">{value}</p>
                    {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
                </div>
                <div className="rounded-2xl bg-white/70 p-2.5 shadow-sm backdrop-blur dark:bg-white/10">
                    <Icon className="size-4" />
                </div>
            </div>
        </div>
    );
}

export default function AdminDashboard({
    days,
    kpis,
    series,
    messagesBySender,
    statusBreakdown,
    agentWorkload,
    waitingChats,
}: Props) {
    const statusData = [
        { name: 'Open', value: statusBreakdown.open },
        { name: 'Closed', value: statusBreakdown.closed },
    ];

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <AdminPageHeader
                    title="Analytics"
                    description="Support volume, agent load, and conversations waiting for a human reply."
                    actions={
                        <>
                            {[7, 30].map((value) => (
                                <Button
                                    key={value}
                                    size="sm"
                                    variant={days === value ? 'default' : 'outline'}
                                    className="rounded-full"
                                    onClick={() =>
                                        router.get('/admin/dashboard', { days: value }, { preserveState: true })
                                    }
                                >
                                    {value}d
                                </Button>
                            ))}
                            <Button asChild size="sm" className="rounded-full bg-[var(--ops-teal)] hover:brightness-105">
                                <Link href="/admin/conversations?filter=unread">View waiting</Link>
                            </Button>
                        </>
                    }
                />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                    <KpiCard title="Open chats" value={kpis.open} icon={CircleDot} tone="ink" />
                    <KpiCard
                        title="Waiting"
                        value={kpis.waiting}
                        icon={MessageSquareWarning}
                        hint="Unread customer replies"
                        tone="amber"
                    />
                    <KpiCard title="Closed today" value={kpis.closed_today} icon={Clock3} tone="slate" />
                    <KpiCard title="Agents online" value={kpis.agents_online} icon={UserCheck} tone="teal" />
                    <KpiCard title="AI sessions" value={kpis.ai_sessions} icon={Bot} tone="teal" />
                    <KpiCard title="Customers" value={kpis.customers_total} icon={Users} tone="ink" />
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                    <div className="ops-card ops-fade-in p-5 xl:col-span-2">
                        <div className="mb-4">
                            <h2 className="text-base font-semibold text-[var(--ops-ink)]">Conversations opened</h2>
                            <p className="text-sm text-muted-foreground">Last {days} days</p>
                        </div>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={series.conversations}>
                                    <defs>
                                        <linearGradient id="convFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} />
                                    <Tooltip />
                                    <Area
                                        type="monotone"
                                        dataKey="total"
                                        stroke="var(--chart-1)"
                                        fill="url(#convFill)"
                                        strokeWidth={2.5}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="ops-card ops-fade-in p-5">
                        <div className="mb-4">
                            <h2 className="text-base font-semibold text-[var(--ops-ink)]">Status mix</h2>
                            <p className="text-sm text-muted-foreground">All conversations</p>
                        </div>
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                                        {statusData.map((_, index) => (
                                            <Cell key={index} fill={chartColors[index % chartColors.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground">
                            {statusData.map((item, index) => (
                                <span key={item.name} className="inline-flex items-center gap-1.5">
                                    <span
                                        className="size-2 rounded-full"
                                        style={{ background: chartColors[index % chartColors.length] }}
                                    />
                                    {item.name}: {item.value}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                    <div className="ops-card ops-fade-in p-5 xl:col-span-2">
                        <div className="mb-4">
                            <h2 className="text-base font-semibold text-[var(--ops-ink)]">Messages</h2>
                            <p className="text-sm text-muted-foreground">Volume over the last {days} days</p>
                        </div>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={series.messages}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} />
                                    <Tooltip />
                                    <Bar dataKey="total" fill="var(--chart-2)" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="ops-card ops-fade-in p-5">
                        <div className="mb-4">
                            <h2 className="text-base font-semibold text-[var(--ops-ink)]">By sender</h2>
                            <p className="text-sm text-muted-foreground">Last {days} days</p>
                        </div>
                        <div className="space-y-2.5">
                            {messagesBySender.map((row) => (
                                <div
                                    key={row.type}
                                    className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 px-3 py-2.5"
                                >
                                    <span className="capitalize text-sm">{row.type}</span>
                                    <Badge className="rounded-full" variant="secondary">
                                        {row.total}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    <div className="ops-card ops-fade-in p-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-semibold text-[var(--ops-ink)]">Waiting chats</h2>
                                <p className="text-sm text-muted-foreground">Needs a human reply</p>
                            </div>
                            <Button asChild size="sm" variant="outline" className="rounded-full">
                                <Link href="/admin/conversations?filter=unread">Open all</Link>
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {waitingChats.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No waiting conversations.</p>
                            ) : (
                                waitingChats.map((chat) => (
                                    <Link
                                        key={chat.id}
                                        href={`/admin/conversations?conversation=${chat.id}&filter=unread`}
                                        className="block rounded-2xl border border-border/60 bg-background/50 px-3 py-2.5 transition hover:border-[var(--ops-teal)]/40 hover:bg-[var(--ops-teal-soft)]/50"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium">{chat.customer.name}</p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {chat.latest_message?.body || 'Attachment'}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="rounded-full">
                                                #{chat.id}
                                            </Badge>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="ops-card ops-fade-in p-5">
                        <div className="mb-4">
                            <h2 className="text-base font-semibold text-[var(--ops-ink)]">Agent workload</h2>
                            <p className="text-sm text-muted-foreground">Open conversations assigned</p>
                        </div>
                        <div className="space-y-2">
                            {agentWorkload.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No active agents.</p>
                            ) : (
                                agentWorkload.map((agent) => (
                                    <div
                                        key={agent.id}
                                        className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/50 px-3 py-2.5"
                                    >
                                        <div>
                                            <p className="text-sm font-medium">{agent.name}</p>
                                            <p className="text-xs capitalize text-muted-foreground">
                                                {agent.role}
                                                {agent.is_online ? ' · online' : ''}
                                            </p>
                                        </div>
                                        <Badge
                                            className="rounded-full"
                                            variant={agent.open_assigned > 0 ? 'default' : 'secondary'}
                                        >
                                            {agent.open_assigned}
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
