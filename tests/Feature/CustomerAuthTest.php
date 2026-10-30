<?php

use App\Models\Setting;
use App\Models\User;
use App\Services\Settings\SupportSettings;
use Illuminate\Support\Facades\Log;

beforeEach(function () {
    $this->seed();
});

test('customer phone must be a 10 digit ghana number', function () {
    $this->post('/support/login/phone', [
        'phone' => 'abc0244123',
    ])->assertSessionHasErrors('phone');

    $this->post('/support/login/phone', [
        'phone' => '024412345',
    ])->assertSessionHasErrors('phone');

    $this->post('/support/login/phone', [
        'phone' => '02441234567',
    ])->assertSessionHasErrors('phone');

    $this->post('/support/login/phone', [
        'phone' => '0244123456',
    ])->assertRedirect(route('customer.login'));
});

test('customer login is a phone then name multi step flow', function () {
    Setting::setValue('otp_enabled', false);

    $this->post('/support/login/phone', [
        'phone' => '0244111222',
    ])->assertRedirect(route('customer.login'));

    $this->get('/support/login')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('customer/login')
            ->where('step', 'name')
            ->where('phone', '0244111222')
        );

    $this->post('/support/login', [
        'name' => 'Ama Customer',
    ])->assertRedirect(route('support.index'));

    $this->assertAuthenticated();

    $user = User::query()->where('phone', '0244111222')->first();
    expect($user)->not->toBeNull()
        ->and($user->name)->toBe('Ama Customer')
        ->and($user->conversation)->not->toBeNull();
});

test('customer receives otp challenge when otp is enabled', function () {
    Setting::setValue('otp_enabled', true);
    Setting::setValue('otp_driver', 'log');

    Log::shouldReceive('info')->atLeast()->once();

    $this->post('/support/login/phone', [
        'phone' => '0244333444',
    ])->assertRedirect(route('customer.login'));

    $this->post('/support/login', [
        'name' => 'Kofi Customer',
    ])->assertRedirect(route('customer.verify'));

    $this->assertGuest();
});

test('same phone restores previous customer chat access', function () {
    Setting::setValue('otp_enabled', false);

    $this->post('/support/login/phone', ['phone' => '0244555666']);
    $this->post('/support/login', ['name' => 'First Name'])
        ->assertRedirect(route('support.index'));

    $userId = auth()->id();
    $conversationId = auth()->user()->conversation->id;

    $this->post('/support/logout');

    $this->post('/support/login/phone', ['phone' => '0244555666'])
        ->assertRedirect(route('customer.login'));

    $this->get('/support/login')
        ->assertInertia(fn ($page) => $page
            ->where('step', 'name')
            ->where('suggestedName', 'First Name')
        );

    $this->post('/support/login', ['name' => 'Updated Name'])
        ->assertRedirect(route('support.index'));

    expect(auth()->id())->toBe($userId)
        ->and(auth()->user()->name)->toBe('Updated Name')
        ->and(auth()->user()->conversation->id)->toBe($conversationId);
});

test('support settings service reads configurable values', function () {
    Setting::setValue('ai_enabled', true);
    Setting::setValue('ai_trigger_mode', 'reply_timeout');
    Setting::setValue('ai_reply_timeout_seconds', 45);

    $settings = app(SupportSettings::class);

    expect($settings->aiEnabled())->toBeTrue()
        ->and($settings->aiTriggerMode())->toBe('reply_timeout')
        ->and($settings->aiReplyTimeoutSeconds())->toBe(45);
});
