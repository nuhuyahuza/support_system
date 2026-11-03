<?php

use App\Enums\UserRole;
use App\Models\Message;
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
    Setting::setValue('agent_ui_mode', 'whatsapp');

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

test('agent deliver endpoint sets delivered_at without read_at', function () {
    $auth = app(CustomerAuthService::class);
    $customer = $auth->findOrCreateCustomer('0244111222', 'Deliver Customer');
    $auth->login($customer);

    $conversation = $customer->conversation;

    $this->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => 'Need help',
    ])->assertOk();

    $message = Message::query()
        ->where('conversation_id', $conversation->id)
        ->where('sender_type', 'customer')
        ->latest('id')
        ->first();
    expect($message->delivered_at)->toBeNull()
        ->and($message->read_at)->toBeNull();

    $agent = User::query()->where('role', UserRole::Agent)->first();

    $this->actingAs($agent)
        ->postJson("/admin/chats/{$conversation->id}/delivered")
        ->assertOk();

    $message->refresh();

    expect($message->delivered_at)->not->toBeNull()
        ->and($message->read_at)->toBeNull();
});

test('marking messages read also sets delivered_at', function () {
    $auth = app(CustomerAuthService::class);
    $customer = $auth->findOrCreateCustomer('0244333444', 'Read Customer');
    $auth->login($customer);

    $conversation = $customer->conversation;

    $this->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => 'Please reply',
    ])->assertOk();

    $message = Message::query()
        ->where('conversation_id', $conversation->id)
        ->where('sender_type', 'customer')
        ->latest('id')
        ->first();

    $agent = User::query()->where('role', UserRole::Agent)->first();

    $this->actingAs($agent)
        ->postJson("/admin/chats/{$conversation->id}/read")
        ->assertOk();

    $message->refresh();

    expect($message->read_at)->not->toBeNull()
        ->and($message->delivered_at)->not->toBeNull();
});

test('message serialization includes delivered_at', function () {
    $auth = app(CustomerAuthService::class);
    $customer = $auth->findOrCreateCustomer('0244555666', 'Serialize Customer');
    $auth->login($customer);

    $conversation = $customer->conversation;

    $response = $this->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => 'Checking payload',
    ]);

    $response->assertOk()
        ->assertJsonPath('message.body', 'Checking payload')
        ->assertJsonPath('message.delivered_at', null)
        ->assertJsonStructure([
            'message' => [
                'id',
                'delivered_at',
                'read_at',
                'body',
            ],
        ]);
});

test('message poll returns receipt updates for pending outbound ids', function () {
    $auth = app(CustomerAuthService::class);
    $customer = $auth->findOrCreateCustomer('0244666777', 'Receipt Poll Customer');
    $auth->login($customer);

    $conversation = $customer->conversation;

    $this->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => 'Waiting for ticks',
    ])->assertOk();

    $message = Message::query()
        ->where('conversation_id', $conversation->id)
        ->where('sender_type', 'customer')
        ->latest('id')
        ->first();

    $agent = User::query()->where('role', UserRole::Agent)->first();
    $this->actingAs($agent)
        ->postJson("/admin/chats/{$conversation->id}/read")
        ->assertOk();

    $auth->login($customer);

    $afterId = Message::query()->where('conversation_id', $conversation->id)->max('id');

    $this->getJson("/support/conversations/{$conversation->id}/messages?after={$afterId}&pending={$message->id}")
        ->assertOk()
        ->assertJsonPath('receipts.0.id', $message->id)
        ->assertJsonPath('messages', [])
        ->assertJson(fn ($json) => $json
            ->where('receipts.0.id', $message->id)
            ->whereType('receipts.0.delivered_at', 'string')
            ->whereType('receipts.0.read_at', 'string')
            ->etc());
});

test('opening inbox delivers pending customer messages without reading inactive chats', function () {
    Setting::setValue('agent_ui_mode', 'whatsapp');

    $auth = app(CustomerAuthService::class);
    $customerA = $auth->findOrCreateCustomer('0244777001', 'Inbox A');
    $customerB = $auth->findOrCreateCustomer('0244777002', 'Inbox B');

    $auth->login($customerA);
    $this->postJson("/support/conversations/{$customerA->conversation->id}/messages", [
        'body' => 'From A',
    ])->assertOk();

    $auth->login($customerB);
    $this->postJson("/support/conversations/{$customerB->conversation->id}/messages", [
        'body' => 'From B',
    ])->assertOk();

    $messageA = Message::query()
        ->where('conversation_id', $customerA->conversation->id)
        ->where('sender_type', 'customer')
        ->latest('id')
        ->first();
    $messageB = Message::query()
        ->where('conversation_id', $customerB->conversation->id)
        ->where('sender_type', 'customer')
        ->latest('id')
        ->first();

    $agent = User::query()->where('role', UserRole::Agent)->first();

    $this->actingAs($agent)
        ->get('/admin/chats?conversation='.$customerA->conversation->id)
        ->assertOk();

    $messageA->refresh();
    $messageB->refresh();

    expect($messageA->delivered_at)->not->toBeNull()
        ->and($messageA->read_at)->not->toBeNull()
        ->and($messageB->delivered_at)->not->toBeNull()
        ->and($messageB->read_at)->toBeNull();
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
            'support_team_name' => 'BestData Support',
            'agent_ui_mode' => 'whatsapp',
            'announcement_title' => 'Pinned Announcement',
            'announcement_body' => 'Welcome',
            'announcement_active' => true,
        ])
        ->assertRedirect();

    expect(Setting::getValue('brand_name'))->toBe('BestDataGH')
        ->and(Setting::getValue('support_team_name'))->toBe('BestData Support')
        ->and(Setting::getValue('ai_enabled', false))->toBeTrue()
        ->and(Setting::getValue('ai_trigger_mode'))->toBe('agents_offline')
        ->and(Setting::getValue('agent_ui_mode'))->toBe('whatsapp');
});
