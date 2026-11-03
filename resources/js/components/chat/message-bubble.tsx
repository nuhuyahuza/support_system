import { Check, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import ImageLightbox from '@/components/chat/image-lightbox';
import { formatMessageTime } from '@/lib/chat-time';
import type { ChatMessage } from '@/types/chat';
import { cn } from '@/lib/utils';

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

export default function MessageBubble({ message, outgoing }: Props) {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const isAi = message.sender_type === 'ai';
    const isSystem = message.sender_type === 'system';
    const showImage = isImageMessage(message) && Boolean(message.attachment_url);
    const showFile = Boolean(message.attachment_url) && !showImage;

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
                {isSystem && (
                    <div className="mb-0.5 text-[11px] font-medium text-[#02a698]">Support</div>
                )}

                {showImage && (
                    <>
                        <button
                            type="button"
                            onClick={() => setLightboxOpen(true)}
                            className="mb-1 block w-full cursor-zoom-in overflow-hidden rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02a698]"
                        >
                            <img
                                src={message.attachment_url!}
                                alt={message.attachment_name ?? 'attachment'}
                                className="max-h-64 w-full rounded-md object-cover"
                                loading="lazy"
                            />
                        </button>
                        <ImageLightbox
                            open={lightboxOpen}
                            onOpenChange={setLightboxOpen}
                            src={message.attachment_url!}
                            alt={message.attachment_name ?? 'attachment'}
                        />
                    </>
                )}

                {showFile && (
                    <a
                        href={message.attachment_url!}
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
                        ) : message.delivered_at ? (
                            <CheckCheck className="size-3.5 text-[var(--wa-meta)]" />
                        ) : (
                            <Check className="size-3.5 text-[var(--wa-meta)]" />
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
