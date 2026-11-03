import { Check, CheckCheck } from 'lucide-react';
import { formatMessageTime } from '@/lib/chat-time';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types/chat';

type Props = {
    message: ChatMessage;
    outgoing: boolean;
};

function isImageMessage(message: ChatMessage): boolean {
    if (message.type === 'image') {
        return true;
    }

    return Boolean(
        message.attachment_url &&
            /\.(jpe?g|png|gif|webp|bmp|heic|heif|svg)$/i.test(message.attachment_name ?? ''),
    );
}

export default function OpsMessageBubble({ message, outgoing }: Props) {
    const isAi = message.sender_type === 'ai';
    const isSystem = message.sender_type === 'system';
    const showImage = isImageMessage(message) && Boolean(message.attachment_url);
    const showFile = Boolean(message.attachment_url) && !showImage;

    if (isSystem) {
        return (
            <div className="flex w-full justify-center py-1">
                <div className="rounded-full bg-muted/80 px-3 py-1 text-[11px] text-muted-foreground">
                    {message.body}
                </div>
            </div>
        );
    }

    return (
        <div className={cn('flex w-full', outgoing ? 'justify-end' : 'justify-start')}>
            <div
                className={cn(
                    'relative max-w-[min(78%,28rem)] rounded-2xl px-3.5 py-2 shadow-sm',
                    outgoing
                        ? 'rounded-br-md bg-[var(--ops-outgoing)] text-[var(--ops-bubble-fg)]'
                        : 'rounded-bl-md bg-[var(--ops-incoming)] text-[var(--ops-bubble-fg)] ring-1 ring-border/50',
                )}
            >
                {isAi ? (
                    <div className="mb-1 text-[11px] font-semibold tracking-wide text-[var(--ops-teal)] uppercase">
                        AI Assistant
                    </div>
                ) : null}

                {showImage ? (
                    <a href={message.attachment_url!} target="_blank" rel="noreferrer" className="mb-1.5 block">
                        <img
                            src={message.attachment_url!}
                            alt={message.attachment_name ?? 'attachment'}
                            className="max-h-64 w-full rounded-xl object-cover"
                            loading="lazy"
                        />
                    </a>
                ) : null}

                {showFile ? (
                    <a
                        href={message.attachment_url!}
                        target="_blank"
                        rel="noreferrer"
                        className="mb-1.5 block text-sm font-medium text-[var(--ops-teal)] underline-offset-2 hover:underline"
                    >
                        {message.attachment_name ?? 'Download file'}
                    </a>
                ) : null}

                {message.body ? (
                    <p className="whitespace-pre-wrap break-words text-[14px] leading-5">{message.body}</p>
                ) : null}

                <div className="mt-1 flex items-center justify-end gap-1">
                    <span className="text-[10px] text-[var(--ops-meta)]">
                        {formatMessageTime(message.created_at)}
                    </span>
                    {outgoing ? (
                        message.read_at ? (
                            <CheckCheck className="size-3.5 text-[var(--ops-teal)]" />
                        ) : message.delivered_at ? (
                            <CheckCheck className="size-3.5 text-[var(--ops-meta)]" />
                        ) : (
                            <Check className="size-3.5 text-[var(--ops-meta)]" />
                        )
                    ) : null}
                </div>
            </div>
        </div>
    );
}
