import { useEffect, useRef } from 'react';
import OpsMessageBubble from '@/components/admin/ops-message-bubble';
import type { ChatMessage } from '@/types/chat';

type Props = {
    messages: ChatMessage[];
    typingLabel?: string | null;
};

export default function OpsMessageThread({ messages, typingLabel }: Props) {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length, typingLabel]);

    return (
        <div className="relative min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,oklch(0.97_0.01_220)_0%,oklch(0.985_0.006_220)_100%)] dark:bg-[linear-gradient(180deg,oklch(0.2_0.03_250)_0%,oklch(0.18_0.025_250)_100%)]">
            <div className="mx-auto flex max-w-3xl flex-col gap-2.5 px-4 py-5 md:px-8">
                {messages.length === 0 ? (
                    <p className="py-16 text-center text-sm text-muted-foreground">No messages yet.</p>
                ) : (
                    messages.map((message) => (
                        <OpsMessageBubble
                            key={message.id}
                            message={message}
                            outgoing={message.sender_type !== 'customer'}
                        />
                    ))
                )}

                {typingLabel ? (
                    <div className="px-1 text-xs text-[var(--ops-meta)]">{typingLabel}</div>
                ) : null}
                <div ref={endRef} />
            </div>
        </div>
    );
}
