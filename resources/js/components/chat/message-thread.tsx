import { useEffect, useRef } from 'react';
import MessageBubble from '@/components/chat/message-bubble';
import PinnedAnnouncement from '@/components/chat/pinned-announcement';
import type { Announcement, ChatMessage } from '@/types/chat';

type Props = {
    messages: ChatMessage[];
    announcement?: Announcement;
    viewerIsCustomer: boolean;
    typingLabel?: string | null;
};

export default function MessageThread({
    messages,
    announcement,
    viewerIsCustomer,
    typingLabel,
}: Props) {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length, typingLabel]);

    return (
        <div className="wa-chat-bg relative flex-1 overflow-y-auto px-4 py-2 md:px-16">
            <PinnedAnnouncement announcement={announcement ?? null} />

            <div className="flex flex-col gap-1.5 pb-4">
                {messages.map((message) => (
                    <MessageBubble
                        key={message.id}
                        message={message}
                        outgoing={
                            viewerIsCustomer
                                ? message.sender_type === 'customer'
                                : message.sender_type !== 'customer'
                        }
                    />
                ))}

                {typingLabel && (
                    <div className="px-2 text-xs text-[var(--wa-muted)]">{typingLabel}</div>
                )}
                <div ref={endRef} />
            </div>
        </div>
    );
}
