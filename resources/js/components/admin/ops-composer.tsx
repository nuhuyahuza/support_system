import { Paperclip, SendHorizontal } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    disabled?: boolean;
    onSend: (payload: { body: string; attachment: File | null }) => Promise<void> | void;
    onTyping?: (typing: boolean) => void;
};

export default function OpsComposer({ disabled, onSend, onTyping }: Props) {
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
        <form
            onSubmit={submit}
            className="shrink-0 border-t border-border/70 bg-[var(--ops-surface)] px-3 py-3 backdrop-blur-md md:px-4"
        >
            {attachment ? (
                <div className="mb-2 flex items-center justify-between rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-xs">
                    <span className="truncate">{attachment.name}</span>
                    <button
                        type="button"
                        className="ml-3 text-destructive"
                        onClick={() => {
                            setAttachment(null);
                            if (fileRef.current) {
                                fileRef.current.value = '';
                            }
                        }}
                    >
                        Remove
                    </button>
                </div>
            ) : null}

            <div className="flex items-end gap-2">
                <button
                    type="button"
                    className="mb-0.5 flex size-10 items-center justify-center rounded-xl border border-border/70 bg-background text-muted-foreground transition hover:bg-muted"
                    aria-label="Attach"
                    onClick={() => fileRef.current?.click()}
                >
                    <Paperclip className="size-4" />
                </button>
                <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                    onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                />

                <input
                    value={body}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder="Write a reply…"
                    disabled={disabled || sending}
                    className="min-w-0 flex-1 rounded-2xl border border-border/70 bg-background px-4 py-2.5 text-sm outline-none ring-[var(--ops-teal)]/30 placeholder:text-muted-foreground focus:ring-2"
                />

                <button
                    type="submit"
                    disabled={disabled || sending || (!body.trim() && !attachment)}
                    className={cn(
                        'mb-0.5 flex size-10 items-center justify-center rounded-xl bg-[var(--ops-teal)] text-white shadow-sm transition hover:brightness-105 disabled:opacity-40',
                    )}
                    aria-label="Send"
                >
                    <SendHorizontal className="size-4" />
                </button>
            </div>
        </form>
    );
}
