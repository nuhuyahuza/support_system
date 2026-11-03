import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
        <>
            <Head title="Settings" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">{brandName} settings</h1>
                    <p className="text-sm text-muted-foreground">
                        Branding, OTP, AI fallback, agent UI mode, and pinned announcements.
                    </p>
                </div>

                <Form
                    action="/admin/settings"
                    method="put"
                    className="space-y-6"
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
                            <Card>
                                <CardHeader>
                                    <CardTitle>Site</CardTitle>
                                    <CardDescription>Names shown across login and chat surfaces</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="brand_name">Site name</Label>
                                        <Input id="brand_name" name="brand_name" defaultValue={settings.brand_name} />
                                        <InputError message={errors.brand_name} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="support_team_name">Support chat name</Label>
                                        <Input
                                            id="support_team_name"
                                            name="support_team_name"
                                            defaultValue={settings.support_team_name}
                                        />
                                        <InputError message={errors.support_team_name} />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Agent interface</CardTitle>
                                    <CardDescription>
                                        Admins always use the dashboard. Choose what agents see after login.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <Label htmlFor="agent_ui_mode">Agent UI mode</Label>
                                    <select
                                        id="agent_ui_mode"
                                        name="agent_ui_mode"
                                        defaultValue={settings.agent_ui_mode ?? 'dashboard'}
                                        className="h-9 w-full max-w-md rounded-md border bg-background px-3 text-sm"
                                    >
                                        <option value="dashboard">Dashboard (sidebar analytics &amp; ops)</option>
                                        <option value="whatsapp">Classic WhatsApp-style inbox</option>
                                    </select>
                                    <InputError message={errors.agent_ui_mode} />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Customer OTP</CardTitle>
                                    <CardDescription>Phone verification for customers</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <input type="hidden" name="otp_enabled" value="0" />
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            name="otp_enabled"
                                            value="1"
                                            defaultChecked={settings.otp_enabled}
                                            className="size-4 rounded border"
                                        />
                                        Require OTP verification
                                    </label>
                                    <div className="max-w-md space-y-2">
                                        <Label htmlFor="otp_driver">OTP driver</Label>
                                        <select
                                            id="otp_driver"
                                            name="otp_driver"
                                            defaultValue={settings.otp_driver}
                                            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                                        >
                                            <option value="log">Log (development)</option>
                                            <option value="twilio">Twilio SMS</option>
                                        </select>
                                        <InputError message={errors.otp_driver} />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>AI fallback</CardTitle>
                                    <CardDescription>Automatic replies when agents are unavailable</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <input type="hidden" name="ai_enabled" value="0" />
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            name="ai_enabled"
                                            value="1"
                                            defaultChecked={settings.ai_enabled}
                                            className="size-4 rounded border"
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
                                                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
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
                                                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                                            >
                                                <option value="agents_offline">When agents are offline</option>
                                                <option value="reply_timeout">After reply timeout</option>
                                                <option value="both">Both</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="max-w-md space-y-2">
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
                                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        API keys stay in `.env` (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`).
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Pinned announcement</CardTitle>
                                    <CardDescription>Shown at the top of customer and staff chats</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
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
                                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <input type="hidden" name="announcement_active" value="0" />
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            name="announcement_active"
                                            value="1"
                                            defaultChecked={announcement?.is_active ?? true}
                                            className="size-4 rounded border"
                                        />
                                        Show announcement in chats
                                    </label>
                                </CardContent>
                            </Card>

                            <Button type="submit" disabled={processing}>
                                {processing ? <Spinner /> : null}
                                Save settings
                            </Button>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}
