import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AuthLayout from '@/layouts/auth-layout';
import ChatLayout from '@/layouts/chat-layout';
import SettingsLayout from '@/layouts/settings/layout';

void createInertiaApp({
    title: (title) => title || 'Support',
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name === 'dashboard':
            case name.startsWith('customer/'):
            case name.startsWith('admin/'):
                return ChatLayout;
            case name.startsWith('auth/'):
                return [ChatLayout, AuthLayout];
            case name.startsWith('settings/'):
                return [ChatLayout, SettingsLayout];
            default:
                return ChatLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#25d366',
    },
});

initializeTheme();
