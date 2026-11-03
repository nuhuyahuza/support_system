<?php

use App\Enums\UserRole;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect('/login');
});

test('authenticated staff are redirected to the admin home', function () {
    $user = User::factory()->create(['role' => UserRole::Admin]);
    $this->actingAs($user);

    $this->get(route('dashboard'))
        ->assertRedirect(route('admin.dashboard'));
});

test('authenticated customers are redirected to support', function () {
    $user = User::factory()->customer()->create();
    $this->actingAs($user);

    $this->get(route('dashboard'))
        ->assertRedirect(route('support.index'));
});
