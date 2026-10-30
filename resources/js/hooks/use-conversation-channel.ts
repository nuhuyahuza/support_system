import { useEffect, useRef } from 'react';
import { getEcho } from '@/lib/echo';
import type { ChatMessage } from '@/types/chat';

type Handlers = {
    onMessage?: (message: ChatMessage) => void;
    onRead?: (payload: { conversation_id: number; message_ids: number[]; read_at: string }) => void;
    onTyping?: (payload: { conversation_id: number; user_id: number; name: string; typing: boolean }) => void;
};

export function useConversationChannel(conversationId: number | null | undefined, handlers: Handlers) {
    const handlersRef = useRef(handlers);
    handlersRef.current = handlers;

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
            handlersRef.current.onMessage?.(payload.message);
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
}
