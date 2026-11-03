import type { PropsWithChildren } from 'react';
import ChatShell from '@/components/chat/chat-shell';

export default function ChatLayout({ children }: PropsWithChildren) {
    return <ChatShell>{children}</ChatShell>;
}
