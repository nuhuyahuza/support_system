<?php

use App\Enums\UserRole;
use App\Models\Setting;
use App\Models\User;
use App\Services\Auth\CustomerAuthService;

beforeEach(function () {
    $this->seed();
    Setting::setValue('otp_enabled', false);
});

test('customer can send a message in their conversation', function () {
    $auth = app(CustomerAuthService::class);
    $customer = $auth->findOrCreateCustomer('0244777888', 'Chat Customer');
    $auth->login($customer);

    $conversation = $customer->conversation;

    $response = $this->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => 'Hello support',
    ]);

    $response->assertOk()
        ->assertJsonPath('message.body', 'Hello support');

    $this->assertDatabaseHas('messages', [
        'conversation_id' => $conversation->id,
        'body' => 'Hello support',
        'sender_type' => 'customer',
    ]);
});

test('agent can view inbox and reply', function () {
    $auth = app(CustomerAuthService::class);
    $customer = $auth->findOrCreateCustomer('0244999000', 'Inbox Customer');
    $conversation = $customer->conversation;

    $agent = User::query()->where('role', UserRole::Agent)->first();

    $this->actingAs($agent)
        ->get('/admin/chats')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('admin/inbox'));

    $this->actingAs($agent)
        ->postJson("/admin/chats/{$conversation->id}/messages", [
            'body' => 'We can help',
        ])
        ->assertOk()
        ->assertJsonPath('message.body', 'We can help');
});

test('admin can update support settings', function () {
    $admin = User::query()->where('role', UserRole::Admin)->first();

    $this->actingAs($admin)
        ->put('/admin/settings', [
            'otp_enabled' => false,
            'otp_driver' => 'log',
            'ai_enabled' => true,
            'ai_provider' => 'openai',
            'ai_trigger_mode' => 'agents_offline',
            'ai_reply_timeout_seconds' => 120,
            'ai_system_prompt' => 'Be helpful.',
            'brand_name' => 'BestDataGH',
            'announcement_title' => 'Pinned Announcement',
            'announcement_body' => 'Welcome',
            'announcement_active' => true,
        ])
        ->assertRedirect();

    expect(Setting::getValue('brand_name'))->toBe('BestDataGH')
        ->and(Setting::getValue('ai_enabled', false))->toBeTrue()
        ->and(Setting::getValue('ai_trigger_mode'))->toBe('agents_offline');
});
