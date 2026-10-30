<?php

namespace App\Services\Settings;

use App\Models\Setting;

class SupportSettings
{
    public function otpEnabled(): bool
    {
        return (bool) Setting::getValue('otp_enabled', (bool) config('support.otp.enabled'));
    }

    public function otpDriver(): string
    {
        return (string) Setting::getValue('otp_driver', (string) config('support.otp.driver'));
    }

    public function aiEnabled(): bool
    {
        return (bool) Setting::getValue('ai_enabled', (bool) config('support.ai.enabled'));
    }

    public function aiProvider(): string
    {
        return (string) Setting::getValue('ai_provider', (string) config('support.ai.provider'));
    }

    public function aiTriggerMode(): string
    {
        return (string) Setting::getValue('ai_trigger_mode', (string) config('support.ai.trigger_mode'));
    }

    public function aiReplyTimeoutSeconds(): int
    {
        return (int) Setting::getValue('ai_reply_timeout_seconds', (int) config('support.ai.reply_timeout_seconds'));
    }

    public function aiSystemPrompt(): string
    {
        return (string) Setting::getValue('ai_system_prompt', (string) config('support.ai.system_prompt'));
    }

    public function brandName(): string
    {
        return (string) Setting::getValue('brand_name', (string) config('support.brand_name'));
    }

    public function supportTeamName(): string
    {
        return (string) Setting::getValue('support_team_name', (string) config('support.support_team_name'));
    }

    /**
     * @return array<string, mixed>
     */
    public function all(): array
    {
        return [
            'otp_enabled' => $this->otpEnabled(),
            'otp_driver' => $this->otpDriver(),
            'ai_enabled' => $this->aiEnabled(),
            'ai_provider' => $this->aiProvider(),
            'ai_trigger_mode' => $this->aiTriggerMode(),
            'ai_reply_timeout_seconds' => $this->aiReplyTimeoutSeconds(),
            'ai_system_prompt' => $this->aiSystemPrompt(),
            'brand_name' => $this->brandName(),
            'support_team_name' => $this->supportTeamName(),
        ];
    }

    /**
     * @param  array<string, mixed>  $values
     */
    public function update(array $values): void
    {
        $allowed = [
            'otp_enabled',
            'otp_driver',
            'ai_enabled',
            'ai_provider',
            'ai_trigger_mode',
            'ai_reply_timeout_seconds',
            'ai_system_prompt',
            'brand_name',
            'support_team_name',
        ];

        foreach ($allowed as $key) {
            if (array_key_exists($key, $values)) {
                Setting::setValue($key, $values[$key]);
            }
        }
    }
}
