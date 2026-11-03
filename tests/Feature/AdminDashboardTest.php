<?php

use App\Enums\UserRole;
use App\Models\Setting;
use App\Models\User;
use App\Services\Auth\CustomerAuthService;
use Illuminate\Support\Facades\Hash;
use InvalidArgumentException;

beforeEach(function () {
    $this->seed();
    Setting::setValue('otp_enabled', false);
    Setting::setValue('agent_ui_mode', 'dashboard');
});

test('admin is redirected to the analytics dashboard', function () {
    $admin = User::query()->where('role', UserRole::Admin)->first();

    $this->actingAs($admin)
        ->get('/admin')
        ->assertRedirect(route('admin.dashboard'));

    $this->actingAs($admin)
        ->get('/admin/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/dashboard')
            ->has('kpis.open')
            ->has('series.conversations')
            ->has('agentWorkload'));
});

test('agent with dashboard ui lands on analytics dashboard', function () {
    $agent = User::query()->where('role', UserRole::Agent)->first();

    $this->actingAs($agent)
        ->get('/admin')
        ->assertRedirect(route('admin.dashboard'));

    $this->actingAs($agent)
        ->get('/admin/chats')
        ->assertRedirect(route('admin.conversations.index'));
});

test('agent with whatsapp ui lands on classic inbox', function () {
    Setting::setValue('agent_ui_mode', 'whatsapp');
    $agent = User::query()->where('role', UserRole::Agent)->first();

    $this->actingAs($agent)
        ->get('/admin')
        ->assertRedirect(route('admin.chats.index'));

    $this->actingAs($agent)
        ->get('/admin/dashboard')
        ->assertRedirect(route('admin.chats.index'));
});

test('admin can open conversations and reply', function () {
    $auth = app(CustomerAuthService::class);
    $customer = $auth->findOrCreateCustomer('0244888111', 'Ops Customer');
    $conversation = $customer->conversation;
    $admin = User::query()->where('role', UserRole::Admin)->first();

    $this->actingAs($admin)
        ->get('/admin/conversations?conversation='.$conversation->id)
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/conversations')
            ->has('conversations.data')
            ->where('activeConversation.id', $conversation->id));

    $this->actingAs($admin)
        ->postJson("/admin/chats/{$conversation->id}/messages", [
            'body' => 'Dashboard reply',
        ])
        ->assertOk()
        ->assertJsonPath('message.body', 'Dashboard reply');
});

test('staff can assign reopen and toggle ai on conversations', function () {
    $auth = app(CustomerAuthService::class);
    $customer = $auth->findOrCreateCustomer('0244888222', 'Assign Customer');
    $conversation = $customer->conversation;
    $admin = User::query()->where('role', UserRole::Admin)->first();
    $agent = User::query()->where('role', UserRole::Agent)->first();

    $this->actingAs($admin)
        ->postJson("/admin/conversations/{$conversation->id}/assign", [
            'assigned_agent_id' => $agent->id,
        ])
        ->assertOk()
        ->assertJsonPath('assigned_agent_id', $agent->id);

    $this->actingAs($admin)
        ->postJson("/admin/conversations/{$conversation->id}/ai", [
            'ai_active' => true,
        ])
        ->assertOk()
        ->assertJsonPath('ai_active', true);

    $this->actingAs($admin)
        ->postJson("/admin/chats/{$conversation->id}/close")
        ->assertOk();

    $this->actingAs($admin)
        ->postJson("/admin/conversations/{$conversation->id}/reopen")
        ->assertOk();

    expect($conversation->fresh()->status->value)->toBe('open');
});

test('agents cannot manage customers agents or settings', function () {
    $agent = User::query()->where('role', UserRole::Agent)->first();

    $this->actingAs($agent)->get('/admin/customers')->assertForbidden();
    $this->actingAs($agent)->get('/admin/agents')->assertForbidden();
    $this->actingAs($agent)->get('/admin/settings')->assertForbidden();
});

test('admin can manage customers and agents', function () {
    $auth = app(CustomerAuthService::class);
    $customer = $auth->findOrCreateCustomer('0244888333', 'Managed Customer');
    $admin = User::query()->where('role', UserRole::Admin)->first();

    $this->actingAs($admin)
        ->get('/admin/customers')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('admin/customers')->has('customers.data'));

    $this->actingAs($admin)
        ->put("/admin/customers/{$customer->id}", ['is_active' => false])
        ->assertRedirect();

    expect($customer->fresh()->is_active)->toBeFalse();

    expect(fn () => $auth->findOrCreateCustomer('0244888333', 'Managed Customer'))
        ->toThrow(InvalidArgumentException::class);
});

test('inactive customers cannot keep using support', function () {
    $auth = app(CustomerAuthService::class);
    $customer = $auth->findOrCreateCustomer('0244888444', 'Inactive Customer');
    $auth->login($customer);
    $customer->update(['is_active' => false]);

    $this->actingAs($customer->fresh())
        ->get('/support')
        ->assertRedirect(route('customer.login'));
});

test('admin can create and deactivate agents', function () {
    $admin = User::query()->where('role', UserRole::Admin)->first();

    $this->actingAs($admin)
        ->post('/admin/agents', [
            'name' => 'New Agent',
            'email' => 'new-agent@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'agent',
        ])
        ->assertRedirect();

    $agent = User::query()->where('email', 'new-agent@example.com')->first();
    expect($agent)->not->toBeNull()
        ->and($agent->role)->toBe(UserRole::Agent)
        ->and(Hash::check('password', $agent->password))->toBeTrue();

    $this->actingAs($admin)
        ->put("/admin/agents/{$agent->id}", ['is_active' => false])
        ->assertRedirect();

    expect($agent->fresh()->is_active)->toBeFalse();

    $this->actingAs($admin)
        ->put("/admin/agents/{$admin->id}", ['is_active' => false])
        ->assertSessionHasErrors('is_active');
});

test('deactivated staff cannot access admin', function () {
    $agent = User::query()->where('role', UserRole::Agent)->first();
    $agent->update(['is_active' => false]);

    $this->actingAs($agent)
        ->get('/admin/dashboard')
        ->assertRedirect('/admin/login');
});

test('staff login redirects based on role and agent ui mode', function () {
    $admin = User::query()->where('role', UserRole::Admin)->first();

    $this->post('/admin/login', [
        'email' => $admin->email,
        'password' => 'password',
    ])->assertRedirect('/admin/dashboard');

    auth()->logout();

    Setting::setValue('agent_ui_mode', 'whatsapp');
    $agent = User::query()->where('role', UserRole::Agent)->first();

    $this->post('/admin/login', [
        'email' => $agent->email,
        'password' => 'password',
    ])->assertRedirect('/admin/chats');
});
