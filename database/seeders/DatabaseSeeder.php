<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Announcement;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Support Admin',
                'password' => Hash::make('password'),
                'role' => UserRole::Admin,
                'email_verified_at' => now(),
            ],
        );

        User::query()->updateOrCreate(
            ['email' => 'agent@example.com'],
            [
                'name' => 'Support Agent',
                'password' => Hash::make('password'),
                'role' => UserRole::Agent,
                'email_verified_at' => now(),
            ],
        );

        $defaults = [
            'otp_enabled' => config('support.otp.enabled') ? '1' : '0',
            'otp_driver' => (string) config('support.otp.driver'),
            'ai_enabled' => config('support.ai.enabled') ? '1' : '0',
            'ai_provider' => (string) config('support.ai.provider'),
            'ai_trigger_mode' => (string) config('support.ai.trigger_mode'),
            'ai_reply_timeout_seconds' => (string) config('support.ai.reply_timeout_seconds'),
            'ai_system_prompt' => (string) config('support.ai.system_prompt'),
            'brand_name' => (string) config('support.brand_name'),
            'support_team_name' => (string) config('support.support_team_name'),
        ];

        foreach ($defaults as $key => $value) {
            Setting::query()->updateOrCreate(
                ['key' => $key],
                ['value' => $value],
            );
        }

        Announcement::query()->updateOrCreate(
            ['title' => 'Pinned Announcement'],
            [
                'body' => "Welcome to support.\nVisit our website for more info.\nWe're here to help.",
                'is_active' => true,
            ],
        );
    }
}
