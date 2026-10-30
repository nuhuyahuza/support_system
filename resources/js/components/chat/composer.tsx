import { Mic, Paperclip, SendHorizontal, Smile } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    disabled?: boolean;
    onSend: (payload: { body: string; attachment: File | null }) => Promise<void> | void;
    onTyping?: (typing: boolean) => void;
};

export default function Composer({ disabled, onSend, onTyping }: Props) {
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const [attachment, setAttachment] = useState<File | null>(null);
    const typingTimeout = useRef<number | null>(null);

    const submit = async (event?: FormEvent) => {
        event?.preventDefault();

        if (disabled || sending || (!body.trim() && !attachment)) {
            return;
        }

        setSending(true);
        try {
            await onSend({ body: body.trim(), attachment });
            setBody('');
            setAttachment(null);
            if (fileRef.current) {
                fileRef.current.value = '';
            }
            onTyping?.(false);
        } finally {
            setSending(false);
        }
    };

    const handleChange = (value: string) => {
        setBody(value);
        onTyping?.(true);

        if (typingTimeout.current) {
            window.clearTimeout(typingTimeout.current);
        }

        typingTimeout.current = window.setTimeout(() => onTyping?.(false), 1200);
    };

    return (
        <form onSubmit={submit} className="flex items-end gap-2 bg-[var(--wa-panel)] px-3 py-2.5">
            <button
                type="button"
                className="mb-1 rounded-full p-2 text-[var(--wa-icon)] hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Emoji"
            >
                <Smile className="size-6" />
            </button>

            <button
                type="button"
                className="mb-1 rounded-full p-2 text-[var(--wa-icon)] hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Attach"
                onClick={() => fileRef.current?.click()}
            >
                <Paperclip className="size-6" />
            </button>
            <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
            />

            <div className="relative min-w-0 flex-1">
                {attachment && (
                    <div className="mb-1 truncate rounded-md bg-black/5 px-2 py-1 text-xs dark:bg-white/10">
                        {attachment.name}
                        <button
                            type="button"
                            className="ml-2 text-red-500"
                            onClick={() => {
                                setAttachment(null);
                                if (fileRef.current) fileRef.current.value = '';
                            }}
                        >
                            remove
                        </button>
                    </div>
                )}
                <input
                    value={body}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder="Type a message"
                    disabled={disabled || sending}
                    className="w-full rounded-lg border-0 bg-[var(--wa-input)] px-4 py-2.5 text-[15px] text-[var(--wa-fg)] outline-none placeholder:text-[var(--wa-muted)]"
                />
            </div>

            <button
                type="submit"
                disabled={disabled || sending || (!body.trim() && !attachment)}
                className={cn(
                    'mb-0.5 flex size-11 items-center justify-center rounded-full bg-[var(--wa-accent)] text-white transition disabled:opacity-50',
                )}
                aria-label={body.trim() || attachment ? 'Send' : 'Voice message'}
            >
                {body.trim() || attachment ? <SendHorizontal className="size-5" /> : <Mic className="size-5" />}
            </button>
        </form>
    );
}
