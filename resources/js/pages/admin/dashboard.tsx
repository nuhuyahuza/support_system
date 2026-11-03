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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
}: {
    title: string;
    value: number;
    icon: typeof CircleDot;
    hint?: string;
}) {
    return (
        <Card className="gap-4 py-4">
            <CardHeader className="flex flex-row items-center justify-between px-5 pb-0">
                <CardDescription className="text-sm font-medium text-muted-foreground">{title}</CardDescription>
                <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                    <Icon className="size-4" />
                </div>
            </CardHeader>
            <CardContent className="px-5">
                <div className="text-3xl font-semibold tracking-tight">{value}</div>
                {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
            </CardContent>
        </Card>
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
                        <p className="text-sm text-muted-foreground">
                            Support volume, agent load, and waiting conversations.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {[7, 30].map((value) => (
                            <Button
                                key={value}
                                size="sm"
                                variant={days === value ? 'default' : 'outline'}
                                onClick={() => router.get('/admin/dashboard', { days: value }, { preserveState: true })}
                            >
                                {value}d
                            </Button>
                        ))}
                        <Button asChild size="sm" variant="secondary">
                            <Link href="/admin/conversations?filter=unread">View waiting</Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                    <KpiCard title="Open chats" value={kpis.open} icon={CircleDot} />
                    <KpiCard title="Waiting" value={kpis.waiting} icon={MessageSquareWarning} hint="Unread customer replies" />
                    <KpiCard title="Closed today" value={kpis.closed_today} icon={Clock3} />
                    <KpiCard title="Agents online" value={kpis.agents_online} icon={UserCheck} />
                    <KpiCard title="AI sessions" value={kpis.ai_sessions} icon={Bot} />
                    <KpiCard title="Customers" value={kpis.customers_total} icon={Users} />
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                    <Card className="xl:col-span-2">
                        <CardHeader>
                            <CardTitle>Conversations opened</CardTitle>
                            <CardDescription>Last {days} days</CardDescription>
                        </CardHeader>
                        <CardContent className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={series.conversations}>
                                    <defs>
                                        <linearGradient id="convFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
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
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Status mix</CardTitle>
                            <CardDescription>All conversations</CardDescription>
                        </CardHeader>
                        <CardContent className="h-72">
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
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                    <Card className="xl:col-span-2">
                        <CardHeader>
                            <CardTitle>Messages</CardTitle>
                            <CardDescription>Volume over the last {days} days</CardDescription>
                        </CardHeader>
                        <CardContent className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={series.messages}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} />
                                    <Tooltip />
                                    <Bar dataKey="total" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>By sender</CardTitle>
                            <CardDescription>Last {days} days</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {messagesBySender.map((row) => (
                                <div key={row.type} className="flex items-center justify-between rounded-lg border px-3 py-2">
                                    <span className="capitalize text-sm">{row.type}</span>
                                    <Badge variant="secondary">{row.total}</Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <div>
                                <CardTitle>Waiting chats</CardTitle>
                                <CardDescription>Needs a human reply</CardDescription>
                            </div>
                            <Button asChild size="sm" variant="outline">
                                <Link href="/admin/conversations?filter=unread">Open all</Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {waitingChats.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No waiting conversations.</p>
                            ) : (
                                waitingChats.map((chat) => (
                                    <Link
                                        key={chat.id}
                                        href={`/admin/conversations?conversation=${chat.id}&filter=unread`}
                                        className="block rounded-lg border px-3 py-2 transition-colors hover:bg-muted/50"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium">{chat.customer.name}</p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {chat.latest_message?.body || 'Attachment'}
                                                </p>
                                            </div>
                                            <Badge variant="outline">#{chat.id}</Badge>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Agent workload</CardTitle>
                            <CardDescription>Open conversations assigned</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {agentWorkload.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No active agents.</p>
                            ) : (
                                agentWorkload.map((agent) => (
                                    <div
                                        key={agent.id}
                                        className="flex items-center justify-between rounded-lg border px-3 py-2"
                                    >
                                        <div>
                                            <p className="text-sm font-medium">{agent.name}</p>
                                            <p className="text-xs capitalize text-muted-foreground">
                                                {agent.role}
                                                {agent.is_online ? ' · online' : ''}
                                            </p>
                                        </div>
                                        <Badge variant={agent.open_assigned > 0 ? 'default' : 'secondary'}>
                                            {agent.open_assigned}
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
