import { Form, Head, Link } from '@inertiajs/react';
import InputError from '@/components/input-error';
import ChatShell from '@/components/chat/chat-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { Announcement, SupportSettings } from '@/types/chat';

type Props = {
    settings: SupportSettings;
    announcement: Announcement;
    brandName: string;
};

export default function AdminSettings({ settings, announcement, brandName }: Props) {
    return (
        <ChatShell>
            <Head title="Support settings" />
            <div className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-y-auto px-4 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">{brandName} settings</h1>
                        <p className="text-sm text-[var(--wa-muted)]">OTP, AI fallback, and pinned announcement</p>
                    </div>
                    <Link href="/admin/chats" className="text-sm text-[var(--wa-accent)] underline">
                        Back to inbox
                    </Link>
                </div>

                <Form
                    action="/admin/settings"
                    method="put"
                    className="space-y-6 rounded-2xl bg-[var(--wa-panel)] p-6 shadow"
                    transform={(data) => ({
                        ...data,
                        otp_enabled: data.otp_enabled === '1' || data.otp_enabled === true,
                        ai_enabled: data.ai_enabled === '1' || data.ai_enabled === true,
                        announcement_active:
                            data.announcement_active === '1' || data.announcement_active === true,
                        ai_reply_timeout_seconds: Number(data.ai_reply_timeout_seconds),
                    })}
                >
                    {({ processing, errors }) => (
                        <>
                            <section className="space-y-4">
                                <h2 className="text-lg font-medium">Site</h2>
                                <div className="space-y-2">
                                    <Label htmlFor="brand_name">Site name</Label>
                                    <Input id="brand_name" name="brand_name" defaultValue={settings.brand_name} />
                                    <p className="text-xs text-[var(--wa-muted)]">
                                        Shown in the browser title, login screen, and chat headers.
                                    </p>
                                    <InputError message={errors.brand_name} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="support_team_name">Support chat name</Label>
                                    <Input
                                        id="support_team_name"
                                        name="support_team_name"
                                        defaultValue={settings.support_team_name}
                                    />
                                    <p className="text-xs text-[var(--wa-muted)]">
                                        The contact name customers see in chat (e.g. Support Team).
                                    </p>
                                    <InputError message={errors.support_team_name} />
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h2 className="text-lg font-medium">Customer OTP</h2>
                                <input type="hidden" name="otp_enabled" value="0" />
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        name="otp_enabled"
                                        value="1"
                                        defaultChecked={settings.otp_enabled}
                                        className="size-4"
                                    />
                                    Require OTP verification
                                </label>
                                <div className="space-y-2">
                                    <Label htmlFor="otp_driver">OTP driver</Label>
                                    <select
                                        id="otp_driver"
                                        name="otp_driver"
                                        defaultValue={settings.otp_driver}
                                        className="w-full rounded-md border border-[var(--wa-border)] bg-[var(--wa-input)] px-3 py-2"
                                    >
                                        <option value="log">Log (development)</option>
                                        <option value="twilio">Twilio SMS</option>
                                    </select>
                                    <InputError message={errors.otp_driver} />
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h2 className="text-lg font-medium">AI fallback</h2>
                                <input type="hidden" name="ai_enabled" value="0" />
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        name="ai_enabled"
                                        value="1"
                                        defaultChecked={settings.ai_enabled}
                                        className="size-4"
                                    />
                                    Enable AI responses
                                </label>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="ai_provider">Provider</Label>
                                        <select
                                            id="ai_provider"
                                            name="ai_provider"
                                            defaultValue={settings.ai_provider}
                                            className="w-full rounded-md border border-[var(--wa-border)] bg-[var(--wa-input)] px-3 py-2"
                                        >
                                            <option value="openai">OpenAI</option>
                                            <option value="anthropic">Anthropic</option>
                                            <option value="none">None</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="ai_trigger_mode">Trigger mode</Label>
                                        <select
                                            id="ai_trigger_mode"
                                            name="ai_trigger_mode"
                                            defaultValue={settings.ai_trigger_mode}
                                            className="w-full rounded-md border border-[var(--wa-border)] bg-[var(--wa-input)] px-3 py-2"
                                        >
                                            <option value="agents_offline">When agents are offline</option>
                                            <option value="reply_timeout">After reply timeout</option>
                                            <option value="both">Both</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ai_reply_timeout_seconds">Reply timeout (seconds)</Label>
                                    <Input
                                        id="ai_reply_timeout_seconds"
                                        name="ai_reply_timeout_seconds"
                                        type="number"
                                        min={5}
                                        defaultValue={settings.ai_reply_timeout_seconds}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ai_system_prompt">System prompt</Label>
                                    <textarea
                                        id="ai_system_prompt"
                                        name="ai_system_prompt"
                                        rows={5}
                                        defaultValue={settings.ai_system_prompt}
                                        className="w-full rounded-md border border-[var(--wa-border)] bg-[var(--wa-input)] px-3 py-2 text-sm"
                                    />
                                </div>
                                <p className="text-xs text-[var(--wa-muted)]">
                                    API keys stay in `.env` (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`).
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h2 className="text-lg font-medium">Pinned announcement</h2>
                                <div className="space-y-2">
                                    <Label htmlFor="announcement_title">Title</Label>
                                    <Input
                                        id="announcement_title"
                                        name="announcement_title"
                                        defaultValue={announcement?.title ?? 'Pinned Announcement'}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="announcement_body">Body</Label>
                                    <textarea
                                        id="announcement_body"
                                        name="announcement_body"
                                        rows={4}
                                        defaultValue={announcement?.body ?? ''}
                                        className="w-full rounded-md border border-[var(--wa-border)] bg-[var(--wa-input)] px-3 py-2 text-sm"
                                    />
                                </div>
                                <input type="hidden" name="announcement_active" value="0" />
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        name="announcement_active"
                                        value="1"
                                        defaultChecked={announcement?.is_active ?? true}
                                        className="size-4"
                                    />
                                    Show announcement in chats
                                </label>
                            </section>

                            <Button
                                type="submit"
                                disabled={processing}
                                className="bg-[var(--wa-accent)] text-white hover:bg-[var(--wa-accent-strong)]"
                            >
                                {processing && <Spinner />}
                                Save settings
                            </Button>
                        </>
                    )}
                </Form>
            </div>
        </ChatShell>
    );
}
