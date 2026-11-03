import { useEffect, useRef, useState } from 'react';
import {
    getEcho,
    getEchoConnectionState,
    subscribeEchoConnection,
    type EchoConnectionState,
} from '@/lib/echo';
import type { ChatMessage } from '@/types/chat';

type Handlers = {
    onMessage?: (message: ChatMessage) => void;
    onDelivered?: (payload: { conversation_id: number; message_ids: number[]; delivered_at: string }) => void;
    onRead?: (payload: { conversation_id: number; message_ids: number[]; read_at: string }) => void;
    onTyping?: (payload: { conversation_id: number; user_id: number; name: string; typing: boolean }) => void;
};

type Options = {
    /** Base URL that accepts ?after= for incremental message fetch */
    pollUrl?: string | null;
    /** Latest known message id used as the poll cursor */
    lastMessageId?: number | null;
    pollIntervalMs?: number;
};

function csrfToken(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}

export function useConversationChannel(
    conversationId: number | null | undefined,
    handlers: Handlers,
    options: Options = {},
) {
    const handlersRef = useRef(handlers);
    handlersRef.current = handlers;

    const lastMessageIdRef = useRef(options.lastMessageId ?? 0);
    lastMessageIdRef.current = options.lastMessageId ?? lastMessageIdRef.current;

    const [connectionState, setConnectionState] = useState<EchoConnectionState>(() => getEchoConnectionState());

    useEffect(() => subscribeEchoConnection(setConnectionState), []);

    // Echo subscription
    useEffect(() => {
        if (!conversationId) {
            return;
        }

        const echo = getEcho();

        if (!echo) {
            return;
        }

        const channel = echo.private(`conversation.${conversationId}`);

        channel.listen('.message.sent', (payload: { message: ChatMessage }) => {
            if (payload.message?.id) {
                lastMessageIdRef.current = Math.max(lastMessageIdRef.current, payload.message.id);
            }
            handlersRef.current.onMessage?.(payload.message);
        });

        channel.listen('.message.delivered', (payload: { conversation_id: number; message_ids: number[]; delivered_at: string }) => {
            handlersRef.current.onDelivered?.(payload);
        });

        channel.listen('.message.read', (payload: { conversation_id: number; message_ids: number[]; read_at: string }) => {
            handlersRef.current.onRead?.(payload);
        });

        channel.listen('.user.typing', (payload: { conversation_id: number; user_id: number; name: string; typing: boolean }) => {
            handlersRef.current.onTyping?.(payload);
        });

        return () => {
            echo.leave(`conversation.${conversationId}`);
        };
    }, [conversationId]);

    // Polling fallback when Echo is not connected
    useEffect(() => {
        if (!conversationId || !options.pollUrl) {
            return;
        }

        if (connectionState === 'connected') {
            return;
        }

        const intervalMs = options.pollIntervalMs ?? 2500;
        let cancelled = false;

        const poll = async () => {
            const after = lastMessageIdRef.current || 0;
            const separator = options.pollUrl!.includes('?') ? '&' : '?';
            const url = `${options.pollUrl}${separator}after=${after}`;

            try {
                const response = await fetch(url, {
                    headers: {
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': csrfToken(),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'same-origin',
                });

                if (!response.ok || cancelled) {
                    return;
                }

                const data = (await response.json()) as { messages?: ChatMessage[] };
                const incoming = data.messages ?? [];

                for (const message of incoming) {
                    lastMessageIdRef.current = Math.max(lastMessageIdRef.current, message.id);
                    handlersRef.current.onMessage?.(message);
                }
            } catch {
                // Keep polling; transient network errors are expected.
            }
        };

        void poll();
        const timer = window.setInterval(() => {
            void poll();
        }, intervalMs);

        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [conversationId, options.pollUrl, options.pollIntervalMs, connectionState]);

    return { connectionState, isLive: connectionState === 'connected' };
}
