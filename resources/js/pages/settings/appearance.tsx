import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';

export default function Appearance() {
    return (
        <>
            <Head title="Appearance settings" />

            <div className="space-y-6">
                <div>
                    <h2 className="text-lg font-medium">Appearance</h2>
                    <p className="text-sm text-[var(--wa-muted)]">
                        Choose light, dark, or follow your system preference
                    </p>
                </div>
                <AppearanceTabs />
            </div>
        </>
    );
}
