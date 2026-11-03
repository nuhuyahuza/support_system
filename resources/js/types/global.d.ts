import type { Auth } from '@/types/auth';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            brandName?: string;
            supportTeamName?: string;
            agentUiMode?: 'dashboard' | 'whatsapp';
            isAdmin?: boolean;
            auth: Auth;
            sidebarOpen: boolean;
            flash?: {
                success?: string | null;
                status?: string | null;
            };
            [key: string]: unknown;
        };
    }
}
