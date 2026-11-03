import { AuthFormPanel, AuthScreen } from '@/components/chat/auth-panel';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <AuthScreen title={title} description={description}>
            <AuthFormPanel className="space-y-6">{children}</AuthFormPanel>
        </AuthScreen>
    );
}
