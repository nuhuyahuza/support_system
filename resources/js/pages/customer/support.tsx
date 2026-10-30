import { Head, router } from '@inertiajs/react';
import {
    Download,
    EllipsisVertical,
    MessageCircle,
    Phone,
    Plus,
    RefreshCw,
    Search,
    Settings,
    Video,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import ChatShell from '@/components/chat/chat-shell';
import Composer from '@/components/chat/composer';
import ConversationListItem from '@/components/chat/conversation-list-item';
import MessageThread from '@/components/chat/message-thread';
import { useConversationChannel } from '@/hooks/use-conversation-channel';
import { initials } from '@/lib/chat-time';
import type { Announcement, ChatMessage, ConversationSummary } from '@/types/chat';
import { cn } from '@/lib/utils';

type Props = {
    brandName: string;
    conversation: ConversationSummary;
    messages: ChatMessage[];
    announcement: Announcement;
    supportOnline: boolean;
    supportLabel: string;
};

export default function CustomerSupport({
    brandName,
    conversation,
    messages: initialMessages,
    announcement,
    supportOnline,
    supportLabel,
}: Props) {
    const [messages, setMessages] = useState(initialMessages);
    const [mobileShowChat, setMobileShowChat] = useState(true);
    const [typingLabel, setTypingLabel] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const appendMessage = useCallback((message: ChatMessage) => {
        setMessages((current) => {
            if (current.some((item) => item.id === message.id)) {
                return current;
            }

            return [...current, message];
        });
    }, []);

    useConversationChannel(conversation.id, {
        onMessage: (message) => {
            appendMessage(message);
            void fetch(`/support/conversations/${conversation.id}/read`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken(),
                    Accept: 'application/json',
                },
            });
        },
        onRead: ({ message_ids, read_at }) => {
            setMessages((current) =>
                current.map((message) =>
                    message_ids.includes(message.id) ? { ...message, read_at } : message,
                ),
            );
        },
        onTyping: ({ name, typing, user_id }) => {
            if (user_id === conversation.customer.id) {
                return;
            }
            setTypingLabel(typing ? `${name} is typing…` : null);
        },
    });

    const filtered = useMemo(() => {
        if (!search.trim()) {
            return true;
        }

        return 'Support Team'.toLowerCase().includes(search.toLowerCase());
    }, [search]);

    const sendMessage = async ({ body, attachment }: { body: string; attachment: File | null }) => {
        const form = new FormData();
        if (body) form.append('body', body);
        if (attachment) form.append('attachment', attachment);

        const response = await fetch(`/support/conversations/${conversation.id}/messages`, {
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

        const data = (await response.json()) as { message: ChatMessage };
        appendMessage(data.message);
    };

    const notifyTyping = (typing: boolean) => {
        void fetch(`/support/conversations/${conversation.id}/typing`, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': csrfToken(),
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ typing }),
        });
    };

    return (
        <ChatShell>
            <Head title={`${brandName} Support`} />

            <aside
                className={cn(
                    'flex h-full w-full flex-col border-r border-[var(--wa-border)] bg-[var(--wa-panel)] md:w-[38%] md:max-w-[420px]',
                    mobileShowChat && 'hidden md:flex',
                )}
            >
                <header className="flex items-center justify-between gap-2 px-4 py-3">
                    <h1 className="truncate text-xl font-semibold">{brandName}</h1>
                    <div className="flex items-center gap-1 text-[var(--wa-icon)]">
                        <button type="button" className="hidden rounded-full bg-[#25d366]/10 px-2.5 py-1 text-xs font-medium text-[#25d366] sm:inline-flex items-center gap-1">
                            <Download className="size-3.5" /> Install
                        </button>
                        <IconButton onClick={() => router.reload()}>
                            <RefreshCw className="size-5" />
                        </IconButton>
                        <IconButton>
                            <Search className="size-5" />
                        </IconButton>
                        <IconButton onClick={() => router.post('/support/logout')}>
                            <EllipsisVertical className="size-5" />
                        </IconButton>
                    </div>
                </header>

                <div className="px-3 pb-2">
                    <div className="flex items-center gap-2 rounded-lg bg-[var(--wa-input)] px-3 py-2">
                        <Search className="size-4 text-[var(--wa-muted)]" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search chats..."
                            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--wa-muted)]"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filtered && (
                        <ConversationListItem
                            conversation={conversation}
                            active
                            title="Support Team"
                            onClick={() => setMobileShowChat(true)}
                        />
                    )}
                </div>

                <nav className="grid grid-cols-4 border-t border-[var(--wa-border)] bg-[var(--wa-panel)] py-2 text-[11px] text-[var(--wa-muted)]">
                    <NavItem active icon={<MessageCircle className="size-5" />} label="Chats" />
                    <NavItem icon={<RefreshCw className="size-5" />} label="Status" />
                    <NavItem icon={<Phone className="size-5" />} label="Calls" />
                    <NavItem icon={<Settings className="size-5" />} label="Settings" />
                </nav>
            </aside>

            <section
                className={cn(
                    'flex h-full min-w-0 flex-1 flex-col bg-[var(--wa-chat-surface)]',
                    !mobileShowChat && 'hidden md:flex',
                )}
            >
                <header className="flex items-center justify-between gap-3 border-b border-[var(--wa-border)] bg-[var(--wa-panel)] px-4 py-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            type="button"
                            className="text-[var(--wa-icon)] md:hidden"
                            onClick={() => setMobileShowChat(false)}
                        >
                            ←
                        </button>
                        <div className="flex size-10 items-center justify-center rounded-full bg-[#dfe5e7] font-semibold text-[#54656f] dark:bg-[#6b7c85] dark:text-white">
                            {initials('Support Team')}
                        </div>
                        <div className="min-w-0">
                            <div className="truncate font-medium">Support Team</div>
                            <div className="flex items-center gap-1.5 text-xs text-[var(--wa-muted)]">
                                <span
                                    className={cn(
                                        'size-2 rounded-full',
                                        supportOnline ? 'bg-[#25d366]' : 'bg-zinc-400',
                                    )}
                                />
                                {supportLabel}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 text-[var(--wa-icon)]">
                        <IconButton>
                            <Video className="size-5" />
                        </IconButton>
                        <IconButton>
                            <Phone className="size-5" />
                        </IconButton>
                        <IconButton>
                            <Search className="size-5" />
                        </IconButton>
                    </div>
                </header>

                <MessageThread
                    messages={messages}
                    announcement={announcement}
                    viewerIsCustomer
                    typingLabel={typingLabel}
                />

                <div className="relative">
                    <Composer onSend={sendMessage} onTyping={notifyTyping} />
                    <button
                        type="button"
                        className="absolute -top-14 right-4 flex size-12 items-center justify-center rounded-full bg-[var(--wa-accent)] text-white shadow-lg"
                        aria-label="New"
                    >
                        <Plus className="size-6" />
                    </button>
                </div>
            </section>
        </ChatShell>
    );
}

function csrfToken(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}

function IconButton({
    children,
    onClick,
}: {
    children: React.ReactNode;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5"
        >
            {children}
        </button>
    );
}

function NavItem({
    icon,
    label,
    active,
}: {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex flex-col items-center gap-1',
                active ? 'text-[var(--wa-accent)]' : 'text-[var(--wa-muted)]',
            )}
        >
            {icon}
            <span>{label}</span>
        </div>
    );
}
