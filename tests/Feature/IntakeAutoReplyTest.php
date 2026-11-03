<?php

use App\Enums\IntakeStatus;
use App\Enums\MessageSenderType;
use App\Enums\UserRole;
use App\Jobs\ProcessAiFallback;
use App\Models\Message;
use App\Models\Setting;
use App\Models\SupportIntake;
use App\Models\User;
use App\Services\Auth\CustomerAuthService;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    $this->seed();
    Setting::setValue('otp_enabled', false);
    Setting::setValue('ai_enabled', false);
});

test('first customer message receives greeting and asks for phone and data size', function () {
    Queue::fake();

    $auth = app(CustomerAuthService::class);
    $customer = $auth->findOrCreateCustomer('0244000001', 'Intake Customer');
    $auth->login($customer);

    $conversation = $customer->conversation;

    $this->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => 'Hi',
    ])->assertOk();

    $conversation->refresh();

    expect($conversation->intake_status)->toBe(IntakeStatus::AwaitingDetails);

    $this->assertDatabaseHas('messages', [
        'conversation_id' => $conversation->id,
        'sender_type' => MessageSenderType::System->value,
    ]);

    $system = Message::query()
        ->where('conversation_id', $conversation->id)
        ->where('sender_type', MessageSenderType::System->value)
        ->latest('id')
        ->first();

    expect($system?->body)->toContain('0240000000 5');

    Queue::assertNotPushed(ProcessAiFallback::class);
});

test('invalid intake format re-asks and does not store a row', function () {
    Queue::fake();

    $auth = app(CustomerAuthService::class);
    $customer = $auth->findOrCreateCustomer('0244000002', 'Invalid Intake');
    $auth->login($customer);
    $conversation = $customer->conversation;

    $this->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => 'Hello',
    ])->assertOk();

    $this->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => 'not-a-phone',
    ])->assertOk();

    $conversation->refresh();

    expect($conversation->intake_status)->toBe(IntakeStatus::AwaitingDetails)
        ->and(SupportIntake::query()->where('conversation_id', $conversation->id)->count())->toBe(0);

    $correction = Message::query()
        ->where('conversation_id', $conversation->id)
        ->where('sender_type', MessageSenderType::System->value)
        ->latest('id')
        ->first();

    expect($correction?->body)->toContain('0240000000 5');

    Queue::assertNotPushed(ProcessAiFallback::class);
});

test('valid intake stores row and thanks customer when ai is off', function () {
    Queue::fake();
    Setting::setValue('ai_enabled', false);

    $auth = app(CustomerAuthService::class);
    $customer = $auth->findOrCreateCustomer('0244000003', 'Valid Intake Off');
    $auth->login($customer);
    $conversation = $customer->conversation;

    $this->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => 'Hi',
    ])->assertOk();

    $this->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => '0241111222 5',
    ])->assertOk();

    $conversation->refresh();

    expect($conversation->intake_status)->toBe(IntakeStatus::Completed);

    $this->assertDatabaseHas('support_intakes', [
        'conversation_id' => $conversation->id,
        'phone' => '0241111222',
        'data_size' => 5,
    ]);

    $thankYou = Message::query()
        ->where('conversation_id', $conversation->id)
        ->where('sender_type', MessageSenderType::System->value)
        ->latest('id')
        ->first();

    expect($thankYou?->body)->toContain('Thank you')
        ->and($thankYou?->body)->toContain('agent will be with you shortly');

    Queue::assertNotPushed(ProcessAiFallback::class);
});

test('valid intake thanks customer and dispatches ai when ai is on', function () {
    Queue::fake();
    Setting::setValue('ai_enabled', true);
    Setting::setValue('ai_provider', 'openai');

    $auth = app(CustomerAuthService::class);
    $customer = $auth->findOrCreateCustomer('0244000004', 'Valid Intake On');
    $auth->login($customer);
    $conversation = $customer->conversation;

    $this->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => 'Hi',
    ])->assertOk();

    $this->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => '0243333444 10',
    ])->assertOk();

    $conversation->refresh();

    expect($conversation->intake_status)->toBe(IntakeStatus::Completed);

    $this->assertDatabaseHas('support_intakes', [
        'conversation_id' => $conversation->id,
        'phone' => '0243333444',
        'data_size' => 10,
    ]);

    $thankYou = Message::query()
        ->where('conversation_id', $conversation->id)
        ->where('sender_type', MessageSenderType::System->value)
        ->latest('id')
        ->first();

    expect($thankYou?->body)->toContain('Thank you')
        ->and($thankYou?->body)->not->toContain('agent will be with you shortly');

    Queue::assertPushed(ProcessAiFallback::class);
});

test('closing a conversation resets intake status', function () {
    $auth = app(CustomerAuthService::class);
    $customer = $auth->findOrCreateCustomer('0244000005', 'Reset Intake');
    $auth->login($customer);
    $conversation = $customer->conversation;

    $this->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => 'Hi',
    ])->assertOk();

    $this->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => '0245555666 3',
    ])->assertOk();

    expect($conversation->fresh()->intake_status)->toBe(IntakeStatus::Completed);

    $agent = User::query()->where('role', UserRole::Agent)->first();

    $this->actingAs($agent)
        ->postJson("/admin/chats/{$conversation->id}/close")
        ->assertOk();

    expect($conversation->fresh()->intake_status)->toBe(IntakeStatus::Pending);
});

test('admin can list and export intakes', function () {
    $auth = app(CustomerAuthService::class);
    $customer = $auth->findOrCreateCustomer('0244000006', 'Export Customer');
    $auth->login($customer);
    $conversation = $customer->conversation;

    $this->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => 'Hi',
    ])->assertOk();

    $this->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => '0247777888 8',
    ])->assertOk();

    $admin = User::query()->where('role', UserRole::Admin)->first();

    $this->actingAs($admin)
        ->get('/admin/intakes')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/intakes')
            ->has('intakes.data', 1)
            ->where('intakes.data.0.phone', '0247777888')
            ->where('intakes.data.0.data_size', 8));

    $export = $this->actingAs($admin)
        ->get('/admin/intakes/export')
        ->assertOk();

    $export->assertHeader('content-disposition');
    expect($export->streamedContent())->toContain('0247777888')
        ->and($export->streamedContent())->toContain('8');
});

test('agent cannot access intakes module', function () {
    $agent = User::query()->where('role', UserRole::Agent)->first();

    $this->actingAs($agent)
        ->get('/admin/intakes')
        ->assertForbidden();
});
