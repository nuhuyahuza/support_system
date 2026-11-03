import { createInertiaApp } from '@inertiajs/react';
import { registerSW } from 'virtual:pwa-register';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import ChatLayout from '@/layouts/chat-layout';
import SettingsLayout from '@/layouts/settings/layout';

// SW is generated under public/build then published to /sw.js (see publish-sw.mjs).
registerSW({ immediate: true });

const dashboardAdminPages = new Set([
    'admin/dashboard',
    'admin/conversations',
    'admin/customers',
    'admin/intakes',
    'admin/agents',
    'admin/settings',
]);

void createInertiaApp({
    title: (title) => title || 'Support',
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case dashboardAdminPages.has(name):
                return AppLayout;
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
        color: 'oklch(0.45 0.08 250)',
    },
});

initializeTheme();
