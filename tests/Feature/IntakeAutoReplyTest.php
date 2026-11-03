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
use App\Services\Chat\IntakeAutoReplyService;
use Illuminate\Support\Facades\Queue;
use PhpOffice\PhpSpreadsheet\IOFactory;

beforeEach(function () {
    $this->seed();
    Setting::setValue('otp_enabled', false);
    Setting::setValue('ai_enabled', false);
});

function completePhoneAndData($test, $conversation, string $phoneData = '0241111222 5'): void
{
    $test->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => 'Hi',
    ])->assertOk();

    $test->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => $phoneData,
    ])->assertOk();
}

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

test('valid phone and data asks for issue choice without storing yet', function () {
    Queue::fake();

    $auth = app(CustomerAuthService::class);
    $customer = $auth->findOrCreateCustomer('0244000010', 'Issue Prompt');
    $auth->login($customer);
    $conversation = $customer->conversation;

    completePhoneAndData($this, $conversation, '0241111222 5');

    $conversation->refresh();

    expect($conversation->intake_status)->toBe(IntakeStatus::AwaitingIssue)
        ->and($conversation->intake_phone)->toBe('0241111222')
        ->and($conversation->intake_data_size)->toBe(5)
        ->and(SupportIntake::query()->where('conversation_id', $conversation->id)->count())->toBe(0);

    $prompt = Message::query()
        ->where('conversation_id', $conversation->id)
        ->where('sender_type', MessageSenderType::System->value)
        ->latest('id')
        ->first();

    expect($prompt?->body)->toContain('main issue')
        ->and($prompt?->body)->toContain('1 -')
        ->and($prompt?->body)->toContain('2 -');

    Queue::assertNotPushed(ProcessAiFallback::class);
});

test('choice 1 stores bought-not-received issue and thanks when ai is off', function () {
    Queue::fake();
    Setting::setValue('ai_enabled', false);

    $auth = app(CustomerAuthService::class);
    $customer = $auth->findOrCreateCustomer('0244000003', 'Valid Intake Off');
    $auth->login($customer);
    $conversation = $customer->conversation;

    completePhoneAndData($this, $conversation, '0241111222 5');

    $this->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => '1',
    ])->assertOk();

    $conversation->refresh();

    expect($conversation->intake_status)->toBe(IntakeStatus::Completed)
        ->and($conversation->intake_phone)->toBeNull()
        ->and($conversation->intake_data_size)->toBeNull();

    $this->assertDatabaseHas('support_intakes', [
        'conversation_id' => $conversation->id,
        'phone' => '0241111222',
        'data_size' => 5,
        'issue' => IntakeAutoReplyService::BOUGHT_NOT_RECEIVED,
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

test('choice 2 then free text stores custom issue and dispatches ai when on', function () {
    Queue::fake();
    Setting::setValue('ai_enabled', true);
    Setting::setValue('ai_provider', 'openai');

    $auth = app(CustomerAuthService::class);
    $customer = $auth->findOrCreateCustomer('0244000004', 'Valid Intake On');
    $auth->login($customer);
    $conversation = $customer->conversation;

    completePhoneAndData($this, $conversation, '0243333444 10');

    $this->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => '2',
    ])->assertOk();

    expect($conversation->fresh()->intake_status)->toBe(IntakeStatus::AwaitingOtherIssue);

    $this->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => 'Wrong package delivered',
    ])->assertOk();

    $conversation->refresh();

    expect($conversation->intake_status)->toBe(IntakeStatus::Completed);

    $this->assertDatabaseHas('support_intakes', [
        'conversation_id' => $conversation->id,
        'phone' => '0243333444',
        'data_size' => 10,
        'issue' => 'Wrong package delivered',
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

test('invalid issue choice re-asks without completing', function () {
    Queue::fake();

    $auth = app(CustomerAuthService::class);
    $customer = $auth->findOrCreateCustomer('0244000011', 'Bad Choice');
    $auth->login($customer);
    $conversation = $customer->conversation;

    completePhoneAndData($this, $conversation);

    $this->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => 'something else',
    ])->assertOk();

    $conversation->refresh();

    expect($conversation->intake_status)->toBe(IntakeStatus::AwaitingIssue)
        ->and(SupportIntake::query()->where('conversation_id', $conversation->id)->count())->toBe(0);

    $correction = Message::query()
        ->where('conversation_id', $conversation->id)
        ->where('sender_type', MessageSenderType::System->value)
        ->latest('id')
        ->first();

    expect($correction?->body)->toContain('1 or 2');
});

test('closing a conversation resets intake status and draft fields', function () {
    $auth = app(CustomerAuthService::class);
    $customer = $auth->findOrCreateCustomer('0244000005', 'Reset Intake');
    $auth->login($customer);
    $conversation = $customer->conversation;

    completePhoneAndData($this, $conversation, '0245555666 3');

    expect($conversation->fresh()->intake_status)->toBe(IntakeStatus::AwaitingIssue)
        ->and($conversation->fresh()->intake_phone)->toBe('0245555666');

    $this->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => '1',
    ])->assertOk();

    expect($conversation->fresh()->intake_status)->toBe(IntakeStatus::Completed);

    $agent = User::query()->where('role', UserRole::Agent)->first();

    $this->actingAs($agent)
        ->postJson("/admin/chats/{$conversation->id}/close")
        ->assertOk();

    $conversation->refresh();

    expect($conversation->intake_status)->toBe(IntakeStatus::Pending)
        ->and($conversation->intake_phone)->toBeNull()
        ->and($conversation->intake_data_size)->toBeNull();
});

test('admin can list and export intakes with three columns', function () {
    $auth = app(CustomerAuthService::class);
    $customer = $auth->findOrCreateCustomer('0244000006', 'Export Customer');
    $auth->login($customer);
    $conversation = $customer->conversation;

    completePhoneAndData($this, $conversation, '0247777888 8');

    $this->postJson("/support/conversations/{$conversation->id}/messages", [
        'body' => '1',
    ])->assertOk();

    $admin = User::query()->where('role', UserRole::Admin)->first();

    $this->actingAs($admin)
        ->get('/admin/intakes')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/intakes')
            ->has('intakes.data', 1)
            ->where('intakes.data.0.phone', '0247777888')
            ->where('intakes.data.0.data_size', 8)
            ->where('intakes.data.0.issue', IntakeAutoReplyService::BOUGHT_NOT_RECEIVED));

    $export = $this->actingAs($admin)
        ->get('/admin/intakes/export')
        ->assertOk();

    $export->assertHeader('content-disposition');
    expect($export->headers->get('content-type'))->toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    $tempPath = tempnam(sys_get_temp_dir(), 'intake-export-').'.xlsx';
    file_put_contents($tempPath, $export->streamedContent());

    $sheet = IOFactory::load($tempPath)->getActiveSheet();
    $rows = $sheet->toArray();

    @unlink($tempPath);

    expect($rows[0])->toBe(['phone', 'data_size', 'main_issue'])
        ->and($rows[1][0])->toBe('0247777888')
        ->and((int) $rows[1][1])->toBe(8)
        ->and($rows[1][2])->toBe(IntakeAutoReplyService::BOUGHT_NOT_RECEIVED)
        ->and(count($rows[0]))->toBe(3);
});

test('agent cannot access intakes module', function () {
    $agent = User::query()->where('role', UserRole::Agent)->first();

    $this->actingAs($agent)
        ->get('/admin/intakes')
        ->assertForbidden();
});
