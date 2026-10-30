<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Services\Settings\SupportSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function edit(SupportSettings $settings): Response
    {
        return Inertia::render('admin/settings', [
            'settings' => $settings->all(),
            'announcement' => Announcement::active(),
            'brandName' => $settings->brandName(),
        ]);
    }

    public function update(Request $request, SupportSettings $settings): RedirectResponse
    {
        $data = $request->validate([
            'otp_enabled' => ['sometimes'],
            'otp_driver' => ['required', 'in:log,twilio'],
            'ai_enabled' => ['sometimes'],
            'ai_provider' => ['required', 'in:openai,anthropic,none'],
            'ai_trigger_mode' => ['required', 'in:agents_offline,reply_timeout,both'],
            'ai_reply_timeout_seconds' => ['required', 'integer', 'min:5', 'max:3600'],
            'ai_system_prompt' => ['required', 'string', 'max:5000'],
            'brand_name' => ['required', 'string', 'max:120'],
            'support_team_name' => ['required', 'string', 'max:120'],
            'announcement_title' => ['required', 'string', 'max:120'],
            'announcement_body' => ['required', 'string', 'max:5000'],
            'announcement_active' => ['sometimes'],
        ]);

        $settings->update([
            'otp_enabled' => $request->boolean('otp_enabled'),
            'otp_driver' => $data['otp_driver'],
            'ai_enabled' => $request->boolean('ai_enabled'),
            'ai_provider' => $data['ai_provider'],
            'ai_trigger_mode' => $data['ai_trigger_mode'],
            'ai_reply_timeout_seconds' => $data['ai_reply_timeout_seconds'],
            'ai_system_prompt' => $data['ai_system_prompt'],
            'brand_name' => $data['brand_name'],
            'support_team_name' => $data['support_team_name'],
        ]);

        $announcement = Announcement::active() ?? new Announcement;
        $announcement->fill([
            'title' => $data['announcement_title'],
            'body' => $data['announcement_body'],
            'is_active' => $request->boolean('announcement_active'),
        ])->save();

        return back()->with('success', 'Settings saved.');
    }
}
