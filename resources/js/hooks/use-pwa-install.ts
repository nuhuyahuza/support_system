import { useCallback, useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandaloneDisplay(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        // iOS Safari
        ('standalone' in navigator &&
            Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
    );
}

export function usePwaInstall() {
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [isStandalone, setIsStandalone] = useState(isStandaloneDisplay);

    useEffect(() => {
        const onBeforeInstall = (event: Event) => {
            event.preventDefault();
            setDeferredPrompt(event as BeforeInstallPromptEvent);
        };

        const onInstalled = () => {
            setDeferredPrompt(null);
            setIsStandalone(true);
        };

        const media = window.matchMedia('(display-mode: standalone)');
        const onDisplayModeChange = () => setIsStandalone(isStandaloneDisplay());

        window.addEventListener('beforeinstallprompt', onBeforeInstall);
        window.addEventListener('appinstalled', onInstalled);
        media.addEventListener('change', onDisplayModeChange);

        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstall);
            window.removeEventListener('appinstalled', onInstalled);
            media.removeEventListener('change', onDisplayModeChange);
        };
    }, []);

    const promptInstall = useCallback(async () => {
        if (!deferredPrompt) {
            return false;
        }

        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        setDeferredPrompt(null);

        return choice.outcome === 'accepted';
    }, [deferredPrompt]);

    return {
        canInstall: Boolean(deferredPrompt) && !isStandalone,
        isStandalone,
        promptInstall,
    };
}
