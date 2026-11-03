import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Bot, MessageSquare, Search } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import OpsComposer from '@/components/admin/ops-composer';
import OpsMessageThread from '@/components/admin/ops-message-thread';
import { StatPill } from '@/components/admin/stat-pill';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConversationChannel } from '@/hooks/use-conversation-channel';
import { getEcho } from '@/lib/echo';
import { cn } from '@/lib/utils';
import type { ChatMessage, ConversationSummary } from '@/types/chat';

type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
};

type AgentOption = { id: number; name: string; role: string };

type Props = {
    filter: string;
    search: string;
    status: string;
    assigned: string;
    from: string;
    to: string;
    conversations: Paginated<ConversationSummary>;
    activeConversation: ConversationSummary | null;
    messages: ChatMessage[];
    agents: AgentOption[];
    overview: { open: number; waiting: number; ai_sessions: number };
};

const filters = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'ai', label: 'AI' },
    { key: 'mine', label: 'Mine' },
    { key: 'open', label: 'Open' },
];

function csrfToken(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}

export default function AdminConversations({
    filter,
    search: initialSearch,
    status,
    assigned,
    from,
    to,
    conversations: initialPage,
    activeConversation,
    messages: initialMessages,
    agents,
    overview,
}: Props) {
    const [page, setPage] = useState(initialPage);
    const [messages, setMessages] = useState(initialMessages);
    const [active, setActive] = useState(activeConversation);
    const [search, setSearch] = useState(initialSearch);
    const [typingLabel, setTypingLabel] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const activeIdRef = useRef(activeConversation?.id ?? null);

    useEffect(() => {
        setPage(initialPage);
        setMessages(initialMessages);
        setActive(activeConversation);
        activeIdRef.current = activeConversation?.id ?? null;
    }, [initialPage, initialMessages, activeConversation]);

    const applyQuery = (params: Record<string, string | number | undefined | null>) => {
        const query: Record<string, string | number> = {};
        const next = {
            filter,
            search,
            status,
            assigned,
            from,
            to,
            conversation: active?.id,
            ...params,
        };

        Object.entries(next).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                query[key] = value;
            }
        });

        router.get('/admin/conversations', query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const appendMessage = useCallback((message: ChatMessage) => {
        setMessages((current) => {
            if (activeIdRef.current !== message.conversation_id) {
                return current;
            }

            if (current.some((item) => item.id === message.id)) {
                return current;
            }

            return [...current, message];
        });

        setPage((current) => ({
            ...current,
            data: current.data
                .map((item) =>
                    item.id === message.conversation_id
                        ? {
                              ...item,
                              last_message_at: message.created_at,
                              latest_message: {
                                  id: message.id,
                                  body: message.body,
                                  type: message.type,
                                  sender_type: message.sender_type,
                                  created_at: message.created_at,
                              },
                              unread_count:
                                  message.sender_type === 'customer' &&
                                  activeIdRef.current !== message.conversation_id
                                      ? item.unread_count + 1
                                      : item.unread_count,
                          }
                        : item,
                )
                .sort((a, b) => (b.last_message_at ?? '').localeCompare(a.last_message_at ?? '')),
        }));
    }, []);

    const lastMessageId = messages.reduce((max, message) => Math.max(max, message.id), 0);
    const pendingReceiptIds = useMemo(
        () =>
            messages
                .filter((message) => message.sender_type === 'agent' && !message.read_at)
                .map((message) => message.id),
        [messages],
    );

    const applyReceipts = useCallback(
        (receipts: { id: number; delivered_at: string | null; read_at: string | null }[]) => {
            if (receipts.length === 0) {
                return;
            }

            const byId = new Map(receipts.map((receipt) => [receipt.id, receipt]));

            setMessages((current) =>
                current.map((message) => {
                    const receipt = byId.get(message.id);
                    if (!receipt) {
                        return message;
                    }

                    return {
                        ...message,
                        delivered_at: receipt.delivered_at ?? message.delivered_at,
                        read_at: receipt.read_at ?? message.read_at,
                    };
                }),
            );
        },
        [],
    );

    useConversationChannel(
        active?.id,
        {
            onMessage: (message) => {
                appendMessage(message);
                if (activeIdRef.current === message.conversation_id && message.sender_type === 'customer') {
                    void fetch(`/admin/chats/${message.conversation_id}/read`, {
                        method: 'POST',
                        headers: {
                            'X-CSRF-TOKEN': csrfToken(),
                            Accept: 'application/json',
                        },
                    });
                }
            },
            onDelivered: ({ message_ids, delivered_at }) => {
                setMessages((current) =>
                    current.map((message) =>
                        message_ids.includes(message.id) && !message.delivered_at
                            ? { ...message, delivered_at }
                            : message,
                    ),
                );
            },
            onRead: ({ message_ids, read_at }) => {
                setMessages((current) =>
                    current.map((message) =>
                        message_ids.includes(message.id)
                            ? { ...message, read_at, delivered_at: message.delivered_at ?? read_at }
                            : message,
                    ),
                );
            },
            onReceipts: applyReceipts,
            onTyping: ({ name, typing }) => {
                setTypingLabel(typing ? `${name} is typing…` : null);
            },
        },
        {
            pollUrl: active ? `/admin/chats/${active.id}` : null,
            lastMessageId,
            pendingReceiptIds,
        },
    );

    useEffect(() => {
        const echo = getEcho();
        if (!echo) {
            return;
        }

        const channel = echo.private('admin.inbox');
        channel.listen('.message.sent', (payload: { message: ChatMessage }) => {
            const message = payload.message;

            if (activeIdRef.current === message.conversation_id) {
                appendMessage(message);
                return;
            }

            if (message.sender_type === 'customer') {
                void fetch(`/admin/chats/${message.conversation_id}/delivered`, {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': csrfToken(),
                        Accept: 'application/json',
                    },
                });
            }

            setPage((current) => {
                const exists = current.data.some((item) => item.id === message.conversation_id);
                if (!exists) {
                    router.reload({ only: ['conversations', 'overview'] });
                    return current;
                }

                return {
                    ...current,
                    data: current.data
                        .map((item) =>
                            item.id === message.conversation_id
                                ? {
                                      ...item,
                                      last_message_at: message.created_at,
                                      latest_message: {
                                          id: message.id,
                                          body: message.body,
                                          type: message.type,
                                          sender_type: message.sender_type,
                                          created_at: message.created_at,
                                      },
                                      unread_count: item.unread_count + 1,
                                  }
                                : item,
                        )
                        .sort((a, b) => (b.last_message_at ?? '').localeCompare(a.last_message_at ?? '')),
                };
            });
        });

        return () => {
            echo.leave('admin.inbox');
        };
    }, [appendMessage]);

    const openConversation = (conversation: ConversationSummary) => {
        applyQuery({ conversation: conversation.id });
    };

    const onSearch = (event: FormEvent) => {
        event.preventDefault();
        applyQuery({ search, conversation: undefined });
    };

    const sendMessage = async ({ body, attachment }: { body: string; attachment: File | null }) => {
        if (!active) {
            return;
        }

        const form = new FormData();
        if (body) {
            form.append('body', body);
        }
        if (attachment) {
            form.append('attachment', attachment);
        }

        const response = await fetch(`/admin/chats/${active.id}/messages`, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': csrfToken(),
                Accept: 'application/json',
            },
            body: form,
        });

        if (!response.ok) {
            throw new Error('Failed to send message');
        }

        const payload = (await response.json()) as { message: ChatMessage };
        appendMessage(payload.message);
    };

    const postJson = async (url: string, body?: Record<string, unknown>) => {
        setBusy(true);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken(),
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: body ? JSON.stringify(body) : undefined,
            });

            if (!response.ok) {
                throw new Error('Request failed');
            }

            router.reload({
                only: ['conversations', 'activeConversation', 'messages', 'overview'],
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <Head title="Conversations" />
            <div className="flex h-full min-h-0 flex-1 overflow-hidden">
                <div
                    className={cn(
                        'flex h-full min-h-0 w-full flex-col border-r border-border/60 bg-[var(--ops-surface)] backdrop-blur-md lg:w-[380px] lg:shrink-0',
                        active ? 'hidden lg:flex' : 'flex',
                    )}
                >
                    <div className="shrink-0 space-y-3 border-b border-border/60 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h1 className="text-lg font-semibold tracking-tight text-[var(--ops-ink)]">
                                    Conversations
                                </h1>
                                <p className="text-xs text-muted-foreground">Live inbox & replies</p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-full"
                                onClick={() => setShowFilters((value) => !value)}
                            >
                                Filters
                            </Button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                            <StatPill label="Open" value={overview.open} tone="teal" />
                            <StatPill label="Waiting" value={overview.waiting} tone="warn" />
                            <StatPill label="AI" value={overview.ai_sessions} tone="muted" />
                        </div>

                        <form onSubmit={onSearch} className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search name or phone"
                                className="h-10 rounded-xl border-border/70 bg-background/80 pl-9"
                            />
                        </form>

                        <div className="flex flex-wrap gap-1.5">
                            {filters.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => applyQuery({ filter: item.key, conversation: undefined })}
                                    className={cn(
                                        'rounded-full px-3 py-1 text-xs font-medium transition',
                                        filter === item.key
                                            ? 'bg-[var(--ops-teal)] text-white shadow-sm'
                                            : 'bg-muted/70 text-muted-foreground hover:bg-muted',
                                    )}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        {showFilters ? (
                            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-background/70 p-3">
                                <select
                                    className="h-9 rounded-xl border border-border/70 bg-background px-2 text-xs"
                                    value={status}
                                    onChange={(event) =>
                                        applyQuery({ status: event.target.value, conversation: undefined })
                                    }
                                >
                                    <option value="">Any status</option>
                                    <option value="open">Open</option>
                                    <option value="closed">Closed</option>
                                </select>
                                <select
                                    className="h-9 rounded-xl border border-border/70 bg-background px-2 text-xs"
                                    value={assigned}
                                    onChange={(event) =>
                                        applyQuery({ assigned: event.target.value, conversation: undefined })
                                    }
                                >
                                    <option value="">Anyone</option>
                                    <option value="unassigned">Unassigned</option>
                                    {agents.map((agent) => (
                                        <option key={agent.id} value={agent.id}>
                                            {agent.name}
                                        </option>
                                    ))}
                                </select>
                                <Input
                                    type="date"
                                    value={from}
                                    className="h-9 rounded-xl text-xs"
                                    onChange={(event) =>
                                        applyQuery({ from: event.target.value, conversation: undefined })
                                    }
                                />
                                <Input
                                    type="date"
                                    value={to}
                                    className="h-9 rounded-xl text-xs"
                                    onChange={(event) =>
                                        applyQuery({ to: event.target.value, conversation: undefined })
                                    }
                                />
                            </div>
                        ) : null}
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {page.data.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
                                <MessageSquare className="size-8 text-muted-foreground/50" />
                                <p className="text-sm text-muted-foreground">No conversations match these filters.</p>
                            </div>
                        ) : (
                            page.data.map((conversation) => (
                                <button
                                    key={conversation.id}
                                    type="button"
                                    onClick={() => openConversation(conversation)}
                                    className={cn(
                                        'w-full border-b border-border/50 px-4 py-3.5 text-left transition',
                                        active?.id === conversation.id
                                            ? 'bg-[var(--ops-teal-soft)]'
                                            : 'hover:bg-muted/40',
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-[var(--ops-ink)]">
                                                {conversation.customer.name}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {conversation.customer.phone}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-1">
                                            {conversation.unread_count > 0 ? (
                                                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--ops-teal)] px-1.5 text-[10px] font-semibold text-white">
                                                    {conversation.unread_count}
                                                </span>
                                            ) : null}
                                            <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                                                {conversation.status}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="mt-2 truncate text-xs text-muted-foreground">
                                        {conversation.latest_message?.body ||
                                            (conversation.latest_message ? 'Attachment' : 'No messages yet')}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {conversation.ai_active ? (
                                            <Badge variant="outline" className="gap-1 rounded-full text-[10px]">
                                                <Bot className="size-3" /> AI
                                            </Badge>
                                        ) : null}
                                        {conversation.assigned_agent ? (
                                            <Badge variant="secondary" className="rounded-full text-[10px]">
                                                {conversation.assigned_agent.name}
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="rounded-full text-[10px]">
                                                Unassigned
                                            </Badge>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {page.last_page > 1 ? (
                        <div className="flex shrink-0 flex-wrap gap-1 border-t border-border/60 p-2">
                            {page.links.map((link, index) => (
                                <Button
                                    key={`${link.label}-${index}`}
                                    size="sm"
                                    variant={link.active ? 'default' : 'ghost'}
                                    disabled={!link.url}
                                    className="h-8"
                                    onClick={() => link.url && router.visit(link.url, { preserveState: true })}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    ) : null}
                </div>

                <div
                    className={cn(
                        'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background/40',
                        active ? 'flex' : 'hidden lg:flex',
                    )}
                >
                    {!active ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
                            <div className="rounded-3xl border border-border/60 bg-[var(--ops-surface)] p-6 shadow-sm backdrop-blur">
                                <MessageSquare className="mx-auto size-10 text-[var(--ops-teal)]" />
                                <p className="mt-3 text-sm font-medium text-[var(--ops-ink)]">Select a conversation</p>
                                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                                    Pick a thread from the list to read the transcript and reply without leaving the
                                    dashboard.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex shrink-0 flex-col gap-3 border-b border-border/60 bg-[var(--ops-surface)] px-4 py-3 backdrop-blur-md md:flex-row md:items-center md:justify-between">
                                <div className="flex min-w-0 items-start gap-3">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="mt-0.5 lg:hidden"
                                        onClick={() => applyQuery({ conversation: undefined })}
                                    >
                                        <ArrowLeft className="size-4" />
                                    </Button>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="truncate text-base font-semibold text-[var(--ops-ink)]">
                                                {active.customer.name}
                                            </h2>
                                            <Badge
                                                variant="outline"
                                                className="rounded-full capitalize"
                                            >
                                                {active.status}
                                            </Badge>
                                            {active.customer.is_online ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] text-[var(--ops-teal)]">
                                                    <span className="size-1.5 rounded-full bg-[var(--ops-teal)]" />
                                                    Online
                                                </span>
                                            ) : null}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{active.customer.phone}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <select
                                        className="h-9 rounded-xl border border-border/70 bg-background px-3 text-xs"
                                        value={active.assigned_agent?.id ?? ''}
                                        disabled={busy}
                                        onChange={(event) =>
                                            void postJson(`/admin/conversations/${active.id}/assign`, {
                                                assigned_agent_id: event.target.value
                                                    ? Number(event.target.value)
                                                    : null,
                                            })
                                        }
                                    >
                                        <option value="">Unassigned</option>
                                        {agents.map((agent) => (
                                            <option key={agent.id} value={agent.id}>
                                                {agent.name}
                                            </option>
                                        ))}
                                    </select>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="rounded-xl"
                                        disabled={busy}
                                        onClick={() =>
                                            void postJson(`/admin/conversations/${active.id}/ai`, {
                                                ai_active: !active.ai_active,
                                            })
                                        }
                                    >
                                        {active.ai_active ? 'Disable AI' : 'Enable AI'}
                                    </Button>
                                    {active.status === 'open' ? (
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="rounded-xl"
                                            disabled={busy}
                                            onClick={() => void postJson(`/admin/chats/${active.id}/close`)}
                                        >
                                            Close
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            className="rounded-xl"
                                            disabled={busy}
                                            onClick={() =>
                                                void postJson(`/admin/conversations/${active.id}/reopen`)
                                            }
                                        >
                                            Reopen
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <OpsMessageThread messages={messages} typingLabel={typingLabel} />

                            <OpsComposer
                                disabled={active.status === 'closed' || busy}
                                onSend={sendMessage}
                                onTyping={(typing) => {
                                    if (!active) {
                                        return;
                                    }

                                    void fetch(`/admin/chats/${active.id}/typing`, {
                                        method: 'POST',
                                        headers: {
                                            'X-CSRF-TOKEN': csrfToken(),
                                            Accept: 'application/json',
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({ typing }),
                                    });
                                }}
                            />
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
