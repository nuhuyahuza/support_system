import { Head, router } from '@inertiajs/react';
import {
    Bot,
    Filter,
    MessageCircle,
    Phone,
    Search,
    Settings,
    Users,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import ChatShell from '@/components/chat/chat-shell';
import Composer from '@/components/chat/composer';
import ConversationListItem from '@/components/chat/conversation-list-item';
import MessageThread from '@/components/chat/message-thread';
import { useConversationChannel } from '@/hooks/use-conversation-channel';
import { getEcho } from '@/lib/echo';
import { initials } from '@/lib/chat-time';
import type { Announcement, ChatMessage, ConversationSummary, SupportSettings } from '@/types/chat';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

type Props = {
    brandName: string;
    filter: string;
    search: string;
    conversations: ConversationSummary[];
    activeConversation: ConversationSummary | null;
    messages: ChatMessage[];
    announcement: Announcement;
    overview: {
        open: number;
        waiting: number;
        agents_online: number;
        ai_sessions: number;
    };
    settings: SupportSettings;
    isAdmin: boolean;
};

const filters = [
    { key: 'all', label: 'All Chats' },
    { key: 'unread', label: 'Unread' },
    { key: 'ai', label: 'AI' },
    { key: 'mine', label: 'Mine' },
    { key: 'open', label: 'Open' },
];

export default function AdminInbox({
    brandName,
    filter,
    search: initialSearch,
    conversations: initialConversations,
    activeConversation,
    messages: initialMessages,
    announcement,
    overview,
    isAdmin,
}: Props) {
    const [conversations, setConversations] = useState(initialConversations);
    const [messages, setMessages] = useState(initialMessages);
    const [active, setActive] = useState(activeConversation);
    const [search, setSearch] = useState(initialSearch);
    const [typingLabel, setTypingLabel] = useState<string | null>(null);
    const [mobileShowChat, setMobileShowChat] = useState(Boolean(activeConversation));

    useEffect(() => {
        setConversations(initialConversations);
        setMessages(initialMessages);
        setActive(activeConversation);
    }, [initialConversations, initialMessages, activeConversation]);

    const appendMessage = useCallback((message: ChatMessage) => {
        setMessages((current) => {
            if (current.some((item) => item.id === message.id)) {
                return current;
            }

            return [...current, message];
        });

        setConversations((current) =>
            current
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
                                  message.sender_type === 'customer' && active?.id !== message.conversation_id
                                      ? item.unread_count + 1
                                      : item.unread_count,
                          }
                        : item,
                )
                .sort((a, b) => (b.last_message_at ?? '').localeCompare(a.last_message_at ?? '')),
        );
    }, [active?.id]);

    useConversationChannel(active?.id, {
        onMessage: (message) => {
            appendMessage(message);
            if (active?.id === message.conversation_id && message.sender_type === 'customer') {
                void fetch(`/admin/chats/${active.id}/read`, {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': csrfToken(),
                        Accept: 'application/json',
                    },
                });
            }
        },
        onRead: ({ message_ids, read_at }) => {
            setMessages((current) =>
                current.map((message) =>
                    message_ids.includes(message.id) ? { ...message, read_at } : message,
                ),
            );
        },
        onTyping: ({ name, typing, user_id }) => {
            if (!active || user_id === active.assigned_agent?.id) {
                setTypingLabel(typing ? `${name} is typing…` : null);
                return;
            }
            setTypingLabel(typing ? `${name} is typing…` : null);
        },
    });

    useEffect(() => {
        const echo = getEcho();
        if (!echo) return;

        const channel = echo.private('admin.inbox');
        channel.listen('.message.sent', (payload: { message: ChatMessage }) => {
            const message = payload.message;
            if (active?.id === message.conversation_id) {
                appendMessage(message);
                return;
            }

            setConversations((current) => {
                const exists = current.some((item) => item.id === message.conversation_id);
                if (!exists) {
                    router.reload({ only: ['conversations', 'overview'] });
                    return current;
                }

                return current
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
                                      message.sender_type === 'customer'
                                          ? item.unread_count + 1
                                          : item.unread_count,
                              }
                            : item,
                    )
                    .sort((a, b) => (b.last_message_at ?? '').localeCompare(a.last_message_at ?? ''));
            });
        });

        return () => {
            echo.leave('admin.inbox');
        };
    }, [active?.id, appendMessage]);

    const openConversation = (conversation: ConversationSummary) => {
        setMobileShowChat(true);
        router.get(
            '/admin/chats',
            { conversation: conversation.id, filter, search },
            { preserveState: true, replace: true, only: ['activeConversation', 'messages', 'conversations', 'overview'] },
        );
    };

    const applyFilter = (next: string) => {
        router.get('/admin/chats', { filter: next, search }, { preserveState: true, replace: true });
    };

    const submitSearch = () => {
        router.get('/admin/chats', { filter, search }, { preserveState: true, replace: true });
    };

    const sendMessage = async ({ body, attachment }: { body: string; attachment: File | null }) => {
        if (!active) return;

        const form = new FormData();
        if (body) form.append('body', body);
        if (attachment) form.append('attachment', attachment);

        const response = await fetch(`/admin/chats/${active.id}/messages`, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': csrfToken(),
                Accept: 'application/json',
            },
            body: form,
        });

        if (!response.ok) {
            throw new Error('Failed to send');
        }

        const data = (await response.json()) as { message: ChatMessage };
        appendMessage(data.message);
    };

    const notifyTyping = (typing: boolean) => {
        if (!active) return;
        void fetch(`/admin/chats/${active.id}/typing`, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': csrfToken(),
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ typing }),
        });
    };

    const stats = useMemo(
        () => [
            { label: 'Open', value: overview.open, icon: MessageCircle },
            { label: 'Waiting', value: overview.waiting, icon: Filter },
            { label: 'Agents', value: overview.agents_online, icon: Users },
            { label: 'AI', value: overview.ai_sessions, icon: Bot },
        ],
        [overview],
    );

    return (
        <ChatShell>
            <Head title={`${brandName} Admin`} />

            <aside
                className={cn(
                    'flex h-full w-full flex-col border-r border-[var(--wa-border)] bg-[var(--wa-panel)] md:w-[38%] md:max-w-[440px]',
                    mobileShowChat && 'hidden md:flex',
                )}
            >
                <header className="flex items-center justify-between px-4 py-3">
                    <div>
                        <h1 className="text-xl font-semibold">{brandName}</h1>
                        <p className="text-xs text-[var(--wa-muted)]">Support inbox</p>
                    </div>
                    <div className="flex items-center gap-1">
                        {isAdmin && (
                            <button
                                type="button"
                                onClick={() => router.visit('/admin/settings')}
                                className="rounded-full p-2 text-[var(--wa-icon)] hover:bg-black/5 dark:hover:bg-white/5"
                            >
                                <Settings className="size-5" />
                            </button>
                        )}
                        <form method="post" action="/logout">
                            <input type="hidden" name="_token" value={csrfToken()} />
                            <button type="submit" className="rounded-full px-2 py-1 text-xs text-[var(--wa-muted)] hover:underline">
                                Logout
                            </button>
                        </form>
                    </div>
                </header>

                <div className="grid grid-cols-4 gap-2 px-3 pb-3">
                    {stats.map((stat) => (
                        <div key={stat.label} className="rounded-xl bg-[var(--wa-input)] px-2 py-2 text-center">
                            <stat.icon className="mx-auto mb-1 size-4 text-[var(--wa-accent)]" />
                            <div className="text-sm font-semibold">{stat.value}</div>
                            <div className="text-[10px] text-[var(--wa-muted)]">{stat.label}</div>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-2 px-3 pb-2">
                    <div className="flex flex-1 items-center gap-2 rounded-lg bg-[var(--wa-input)] px-3 py-2">
                        <Search className="size-4 text-[var(--wa-muted)]" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
                            placeholder="Search chats..."
                            className="w-full bg-transparent text-sm outline-none"
                        />
                    </div>
                </div>

                <div className="flex gap-1 overflow-x-auto px-3 pb-2">
                    {filters.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => applyFilter(item.key)}
                            className={cn(
                                'shrink-0 rounded-full px-3 py-1 text-xs',
                                filter === item.key
                                    ? 'bg-[var(--wa-accent)] text-white'
                                    : 'bg-[var(--wa-input)] text-[var(--wa-muted)]',
                            )}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {conversations.map((conversation) => (
                        <ConversationListItem
                            key={conversation.id}
                            conversation={conversation}
                            active={active?.id === conversation.id}
                            onClick={() => openConversation(conversation)}
                        />
                    ))}
                    {conversations.length === 0 && (
                        <div className="px-4 py-10 text-center text-sm text-[var(--wa-muted)]">No chats yet</div>
                    )}
                </div>
            </aside>

            <section
                className={cn(
                    'flex h-full min-w-0 flex-1 flex-col bg-[var(--wa-chat-surface)]',
                    !mobileShowChat && 'hidden md:flex',
                )}
            >
                {active ? (
                    <>
                        <header className="flex items-center justify-between gap-3 border-b border-[var(--wa-border)] bg-[var(--wa-panel)] px-4 py-2.5">
                            <div className="flex min-w-0 items-center gap-3">
                                <button
                                    type="button"
                                    className="md:hidden"
                                    onClick={() => setMobileShowChat(false)}
                                >
                                    ←
                                </button>
                                <div className="flex size-10 items-center justify-center rounded-full bg-[#dfe5e7] font-semibold dark:bg-[#6b7c85] dark:text-white">
                                    {initials(active.customer.name)}
                                </div>
                                <div className="min-w-0">
                                    <div className="truncate font-medium">{active.customer.name}</div>
                                    <div className="truncate text-xs text-[var(--wa-muted)]">
                                        {active.customer.phone}
                                        {active.ai_active ? ' · AI active' : ''}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-[var(--wa-icon)]">
                                <Phone className="size-5" />
                                <button
                                    type="button"
                                    className="rounded-full px-3 py-1 text-xs text-[var(--wa-muted)] hover:bg-black/5"
                                    onClick={() =>
                                        void fetch(`/admin/chats/${active.id}/close`, {
                                            method: 'POST',
                                            headers: {
                                                'X-CSRF-TOKEN': csrfToken(),
                                                Accept: 'application/json',
                                            },
                                        }).then(() => router.reload())
                                    }
                                >
                                    Close
                                </button>
                            </div>
                        </header>

                        <MessageThread
                            messages={messages}
                            announcement={announcement}
                            viewerIsCustomer={false}
                            typingLabel={typingLabel}
                        />

                        <Composer onSend={sendMessage} onTyping={notifyTyping} />
                    </>
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-[var(--wa-muted)]">
                        <MessageCircle className="size-12 opacity-40" />
                        <p>Select a conversation</p>
                    </div>
                )}
            </section>
        </ChatShell>
    );
}

function csrfToken(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}
