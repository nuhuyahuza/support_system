import { formatChatTime, initials } from '@/lib/chat-time';
import type { ConversationSummary } from '@/types/chat';
import { cn } from '@/lib/utils';

type Props = {
    conversation: ConversationSummary;
    active?: boolean;
    title?: string;
    subtitle?: string;
    onClick?: () => void;
};

export default function ConversationListItem({
    conversation,
    active,
    title,
    subtitle,
    onClick,
}: Props) {
    const displayTitle = title ?? conversation.customer.name;
    const preview =
        subtitle ??
        conversation.latest_message?.body ??
        (conversation.latest_message?.type === 'image'
            ? 'Photo'
            : conversation.latest_message?.type === 'file'
              ? 'Attachment'
              : 'No messages yet');

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex w-full items-center gap-3 border-b border-[var(--wa-border)] px-3 py-3 text-left transition hover:bg-[var(--wa-hover)]',
                active && 'bg-[var(--wa-hover)]',
            )}
        >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#dfe5e7] text-base font-semibold text-[#54656f] dark:bg-[#6b7c85] dark:text-white">
                {initials(displayTitle) || 'S'}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                    <div className="truncate text-[16px] font-medium">{displayTitle}</div>
                    <div className="shrink-0 text-[12px] text-[var(--wa-muted)]">
                        {formatChatTime(conversation.last_message_at)}
                    </div>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                    <div className="truncate text-[13.5px] text-[var(--wa-muted)]">{preview}</div>
                    {conversation.unread_count > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--wa-accent)] px-1.5 text-[11px] font-semibold text-white">
                            {conversation.unread_count}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}
