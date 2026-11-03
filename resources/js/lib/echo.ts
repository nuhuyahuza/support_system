import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<'reverb'>;
    }
}

export type EchoConnectionState = 'unavailable' | 'connecting' | 'connected' | 'disconnected';

let echoInstance: Echo<'reverb'> | null = null;
let connectionState: EchoConnectionState = 'unavailable';
const connectionListeners = new Set<(state: EchoConnectionState) => void>();

function setConnectionState(state: EchoConnectionState) {
    if (connectionState === state) {
        return;
    }

    connectionState = state;
    connectionListeners.forEach((listener) => listener(state));
}

export function getEchoConnectionState(): EchoConnectionState {
    return connectionState;
}

export function subscribeEchoConnection(listener: (state: EchoConnectionState) => void): () => void {
    connectionListeners.add(listener);
    listener(connectionState);

    return () => {
        connectionListeners.delete(listener);
    };
}

export function getEcho(): Echo<'reverb'> | null {
    if (typeof window === 'undefined') {
        return null;
    }

    if (echoInstance) {
        return echoInstance;
    }

    const key = import.meta.env.VITE_REVERB_APP_KEY;
    const host = import.meta.env.VITE_REVERB_HOST;

    if (!key || !host) {
        setConnectionState('unavailable');
        console.info(
            '[echo] WebSocket unavailable (missing VITE_REVERB_APP_KEY or VITE_REVERB_HOST). Chat will use polling fallback.',
        );
        return null;
    }

    // Baked-in localhost breaks HTTPS production browsers — warn so ops rebuild with public host.
    if (
        typeof window !== 'undefined' &&
        window.location.protocol === 'https:' &&
        (host === 'localhost' || host === '127.0.0.1')
    ) {
        console.warn(
            `[echo] VITE_REVERB_HOST is "${host}" on an HTTPS page. Set REVERB_HOST/VITE_REVERB_HOST to your public hostname and run npm run build. Polling fallback remains active until WebSockets connect.`,
        );
    }

    window.Pusher = Pusher;

    const scheme = import.meta.env.VITE_REVERB_SCHEME ?? 'https';
    const port = Number(import.meta.env.VITE_REVERB_PORT ?? (scheme === 'https' ? 443 : 80));

    setConnectionState('connecting');

    echoInstance = new Echo({
        broadcaster: 'reverb',
        key,
        wsHost: host,
        wsPort: port,
        wssPort: port,
        forceTLS: scheme === 'https',
        enabledTransports: ['ws', 'wss'],
        authEndpoint: '/broadcasting/auth',
    });

    window.Echo = echoInstance;

    const connection = echoInstance.connector?.pusher?.connection;

    if (connection) {
        const syncState = () => {
            const state = connection.state as string;
            if (state === 'connected') {
                setConnectionState('connected');
            } else if (state === 'connecting' || state === 'initialized') {
                setConnectionState('connecting');
            } else if (state === 'unavailable' || state === 'failed') {
                setConnectionState('unavailable');
            } else {
                setConnectionState('disconnected');
            }
        };

        connection.bind('state_change', syncState);
        connection.bind('connected', () => setConnectionState('connected'));
        connection.bind('disconnected', () => setConnectionState('disconnected'));
        connection.bind('unavailable', () => setConnectionState('unavailable'));
        connection.bind('failed', () => setConnectionState('unavailable'));
        syncState();
    } else {
        setConnectionState('unavailable');
    }

    return echoInstance;
}
