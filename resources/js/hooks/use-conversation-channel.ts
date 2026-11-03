import { useEffect, useRef, useState } from 'react';
import {
    getEcho,
    getEchoConnectionState,
    subscribeEchoConnection,
    type EchoConnectionState,
} from '@/lib/echo';
import type { ChatMessage } from '@/types/chat';

export type ReceiptUpdate = {
    id: number;
    delivered_at: string | null;
    read_at: string | null;
};

type Handlers = {
    onMessage?: (message: ChatMessage) => void;
    onDelivered?: (payload: { conversation_id: number; message_ids: number[]; delivered_at: string }) => void;
    onRead?: (payload: { conversation_id: number; message_ids: number[]; read_at: string }) => void;
    onReceipts?: (receipts: ReceiptUpdate[]) => void;
    onTyping?: (payload: { conversation_id: number; user_id: number; name: string; typing: boolean }) => void;
};

type Options = {
    /** Base URL that accepts ?after= for incremental message fetch */
    pollUrl?: string | null;
    /** Latest known message id used as the poll cursor */
    lastMessageId?: number | null;
    /** Outbound message ids still waiting for delivered/read updates */
    pendingReceiptIds?: number[];
    pollIntervalMs?: number;
};

function csrfToken(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}

function asIdList(ids: Array<number | string> | undefined): number[] {
    return (ids ?? []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0);
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

    const pendingReceiptIdsRef = useRef<number[]>(options.pendingReceiptIds ?? []);
    pendingReceiptIdsRef.current = options.pendingReceiptIds ?? [];

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
            handlersRef.current.onDelivered?.({
                ...payload,
                message_ids: asIdList(payload.message_ids),
            });
        });

        channel.listen('.message.read', (payload: { conversation_id: number; message_ids: number[]; read_at: string }) => {
            handlersRef.current.onRead?.({
                ...payload,
                message_ids: asIdList(payload.message_ids),
            });
        });

        channel.listen('.user.typing', (payload: { conversation_id: number; user_id: number; name: string; typing: boolean }) => {
            handlersRef.current.onTyping?.(payload);
        });

        return () => {
            echo.leave(`conversation.${conversationId}`);
        };
    }, [conversationId]);

    // Polling: always used when Echo is down; also polls receipts while any are pending
    // (covers production when WebSockets fail but HTTP polling still delivers new messages).
    useEffect(() => {
        if (!conversationId || !options.pollUrl) {
            return;
        }

        const echoLive = connectionState === 'connected';
        const intervalMs = options.pollIntervalMs ?? 2500;
        let cancelled = false;

        const poll = async () => {
            const pending = pendingReceiptIdsRef.current;
            const after = lastMessageIdRef.current || 0;

            // When live, only hit the network if we still need receipt updates.
            if (echoLive && pending.length === 0) {
                return;
            }

            const separator = options.pollUrl!.includes('?') ? '&' : '?';
            const pendingParam = pending.length > 0 ? `&pending=${pending.join(',')}` : '';
            // When Echo is live, skip fetching new messages (after=max int effectively unused — use after=last)
            // but still request receipts. Using after=last keeps messages empty.
            const url = `${options.pollUrl}${separator}after=${after}${pendingParam}`;

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

                const data = (await response.json()) as {
                    messages?: ChatMessage[];
                    receipts?: ReceiptUpdate[];
                };

                if (!echoLive) {
                    const incoming = data.messages ?? [];
                    for (const message of incoming) {
                        lastMessageIdRef.current = Math.max(lastMessageIdRef.current, message.id);
                        handlersRef.current.onMessage?.(message);
                    }
                }

                const receipts = data.receipts ?? [];
                if (receipts.length > 0) {
                    handlersRef.current.onReceipts?.(receipts);
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
