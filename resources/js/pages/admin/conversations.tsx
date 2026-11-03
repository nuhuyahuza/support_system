import { Head, router } from '@inertiajs/react';
import { Bot, Search, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Composer from '@/components/chat/composer';
import MessageThread from '@/components/chat/message-thread';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
            <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Conversations</h1>
                        <p className="text-sm text-muted-foreground">
                            Filter, assign, and reply without leaving the dashboard.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                        <Badge variant="secondary">Open {overview.open}</Badge>
                        <Badge variant="secondary">Waiting {overview.waiting}</Badge>
                        <Badge variant="secondary">AI {overview.ai_sessions}</Badge>
                    </div>
                </div>

                <div className="grid gap-3 rounded-xl border bg-card p-4 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
                    <form onSubmit={onSearch} className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search name or phone"
                            className="pl-9"
                        />
                    </form>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Status</Label>
                        <select
                            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                            value={status}
                            onChange={(event) => applyQuery({ status: event.target.value, conversation: undefined })}
                        >
                            <option value="">Any</option>
                            <option value="open">Open</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Assigned</Label>
                        <select
                            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                            value={assigned}
                            onChange={(event) => applyQuery({ assigned: event.target.value, conversation: undefined })}
                        >
                            <option value="">Anyone</option>
                            <option value="unassigned">Unassigned</option>
                            {agents.map((agent) => (
                                <option key={agent.id} value={agent.id}>
                                    {agent.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">From</Label>
                        <Input
                            type="date"
                            value={from}
                            onChange={(event) => applyQuery({ from: event.target.value, conversation: undefined })}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">To</Label>
                        <Input
                            type="date"
                            value={to}
                            onChange={(event) => applyQuery({ to: event.target.value, conversation: undefined })}
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {filters.map((item) => (
                        <Button
                            key={item.key}
                            size="sm"
                            variant={filter === item.key ? 'default' : 'outline'}
                            onClick={() => applyQuery({ filter: item.key, conversation: undefined })}
                        >
                            {item.label}
                        </Button>
                    ))}
                </div>

                <div className="grid min-h-[70vh] flex-1 overflow-hidden rounded-xl border bg-card lg:grid-cols-[340px_minmax(0,1fr)]">
                    <div className="flex min-h-0 flex-col border-b lg:border-r lg:border-b-0">
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            {page.data.length === 0 ? (
                                <p className="p-6 text-sm text-muted-foreground">No conversations match these filters.</p>
                            ) : (
                                page.data.map((conversation) => (
                                    <button
                                        key={conversation.id}
                                        type="button"
                                        onClick={() => openConversation(conversation)}
                                        className={cn(
                                            'w-full border-b px-4 py-3 text-left transition-colors hover:bg-muted/40',
                                            active?.id === conversation.id && 'bg-muted/60',
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium">{conversation.customer.name}</p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {conversation.customer.phone}
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end gap-1">
                                                {conversation.unread_count > 0 ? (
                                                    <Badge>{conversation.unread_count}</Badge>
                                                ) : null}
                                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
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
                                                <Badge variant="outline" className="gap-1">
                                                    <Bot className="size-3" /> AI
                                                </Badge>
                                            ) : null}
                                            {conversation.assigned_agent ? (
                                                <Badge variant="secondary">{conversation.assigned_agent.name}</Badge>
                                            ) : (
                                                <Badge variant="outline">Unassigned</Badge>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                        {page.last_page > 1 ? (
                            <div className="flex flex-wrap gap-1 border-t p-2">
                                {page.links.map((link, index) => (
                                    <Button
                                        key={`${link.label}-${index}`}
                                        size="sm"
                                        variant={link.active ? 'default' : 'ghost'}
                                        disabled={!link.url}
                                        onClick={() => link.url && router.visit(link.url, { preserveState: true })}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <div className="flex min-h-0 min-w-0 flex-col">
                        {!active ? (
                            <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
                                Select a conversation to view the transcript and reply.
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h2 className="truncate text-lg font-semibold">{active.customer.name}</h2>
                                            <Badge variant="outline" className="capitalize">
                                                {active.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {active.customer.phone}
                                            {active.customer.is_online ? ' · online' : ''}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <select
                                            className="h-9 rounded-md border bg-background px-3 text-sm"
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
                                                disabled={busy}
                                                onClick={() => void postJson(`/admin/chats/${active.id}/close`)}
                                            >
                                                Close
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                disabled={busy}
                                                onClick={() => void postJson(`/admin/conversations/${active.id}/reopen`)}
                                            >
                                                Reopen
                                            </Button>
                                        )}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => applyQuery({ conversation: undefined })}
                                        >
                                            <X className="size-4" />
                                        </Button>
                                    </div>
                                </div>

                                <MessageThread
                                    messages={messages}
                                    viewerIsCustomer={false}
                                    typingLabel={typingLabel}
                                />

                                <div className="border-t bg-background p-3">
                                    <Composer
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
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
