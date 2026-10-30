import { Check, CheckCheck } from 'lucide-react';
import { formatMessageTime } from '@/lib/chat-time';
import type { ChatMessage } from '@/types/chat';
import { cn } from '@/lib/utils';

type Props = {
    message: ChatMessage;
    outgoing: boolean;
};

export default function MessageBubble({ message, outgoing }: Props) {
    const isAi = message.sender_type === 'ai';

    return (
        <div className={cn('flex w-full', outgoing ? 'justify-end' : 'justify-start')}>
            <div
                className={cn(
                    'relative max-w-[78%] rounded-lg px-3 py-1.5 shadow-sm',
                    outgoing
                        ? 'rounded-tr-none bg-[var(--wa-outgoing)] text-[var(--wa-bubble-fg)]'
                        : 'rounded-tl-none bg-[var(--wa-incoming)] text-[var(--wa-bubble-fg)]',
                )}
            >
                {isAi && (
                    <div className="mb-0.5 text-[11px] font-medium text-[#02a698]">AI Assistant</div>
                )}

                {message.type === 'image' && message.attachment_url && (
                    <a href={message.attachment_url} target="_blank" rel="noreferrer" className="mb-1 block">
                        <img
                            src={message.attachment_url}
                            alt={message.attachment_name ?? 'attachment'}
                            className="max-h-64 rounded-md object-cover"
                        />
                    </a>
                )}

                {message.type === 'file' && message.attachment_url && (
                    <a
                        href={message.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mb-1 block text-sm underline"
                    >
                        {message.attachment_name ?? 'Download file'}
                    </a>
                )}

                {message.body && (
                    <p className="whitespace-pre-wrap break-words text-[14.5px] leading-5">{message.body}</p>
                )}

                <div className="mt-0.5 flex items-center justify-end gap-1">
                    <span className="text-[11px] text-[var(--wa-meta)]">{formatMessageTime(message.created_at)}</span>
                    {outgoing && (
                        message.read_at ? (
                            <CheckCheck className="size-3.5 text-[#53bdeb]" />
                        ) : (
                            <Check className="size-3.5 text-[var(--wa-meta)]" />
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
