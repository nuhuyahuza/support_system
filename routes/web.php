<?php

use App\Http\Controllers\Admin\AgentController as AdminAgentController;
use App\Http\Controllers\Admin\ChatController as AdminChatController;
use App\Http\Controllers\Admin\ConversationController as AdminConversationController;
use App\Http\Controllers\Admin\CustomerController as AdminCustomerController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\IntakeController as AdminIntakeController;
use App\Http\Controllers\Admin\SettingsController as AdminSettingsController;
use App\Http\Controllers\Customer\AuthController as CustomerAuthController;
use App\Http\Controllers\Customer\SupportController;
use App\Http\Controllers\ManifestController;
use App\Http\Controllers\PresenceController;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsureCustomer;
use App\Http\Middleware\EnsureStaff;
use App\Support\StaffHome;
use Illuminate\Support\Facades\Route;

Route::get('/manifest.webmanifest', ManifestController::class)->name('manifest');

Route::get('/', function () {
    if (auth()->check()) {
        if (auth()->user()->isCustomer()) {
            return redirect()->route('support.index');
        }

        if (auth()->user()->isStaff()) {
            return redirect()->route(StaffHome::routeName());
        }
    }

    return redirect()->route('customer.login');
})->name('home');

Route::middleware('guest')->group(function () {
    Route::get('/login', [CustomerAuthController::class, 'create'])->name('customer.login');
    Route::post('/login/phone', [CustomerAuthController::class, 'storePhone'])->name('customer.login.phone');
    Route::post('/login/back', [CustomerAuthController::class, 'backToPhone'])->name('customer.login.back');
    Route::post('/login', [CustomerAuthController::class, 'store'])->name('customer.login.store');
    Route::get('/verify', [CustomerAuthController::class, 'showVerify'])->name('customer.verify');
    Route::post('/verify', [CustomerAuthController::class, 'verify'])->name('customer.verify.store');

    // Legacy customer auth URLs (pre-/login move)
    Route::get('/support/login', fn () => redirect('/login'));
    Route::post('/support/login/phone', [CustomerAuthController::class, 'storePhone']);
    Route::post('/support/login/back', [CustomerAuthController::class, 'backToPhone']);
    Route::post('/support/login', [CustomerAuthController::class, 'store']);
    Route::get('/support/verify', fn () => redirect('/verify'));
    Route::post('/support/verify', [CustomerAuthController::class, 'verify']);
});

Route::post('/logout', [CustomerAuthController::class, 'destroy'])
    ->middleware('auth')
    ->name('customer.logout');

Route::post('/support/logout', [CustomerAuthController::class, 'destroy'])
    ->middleware('auth');

Route::post('/presence', [PresenceController::class, 'update'])
    ->middleware('auth')
    ->name('presence.update');

Route::middleware(['auth', EnsureCustomer::class])->prefix('support')->name('support.')->group(function () {
    Route::get('/', [SupportController::class, 'index'])->name('index');
    Route::get('/conversations/{conversation}/messages', [SupportController::class, 'messages'])->name('messages');
    Route::post('/conversations/{conversation}/messages', [SupportController::class, 'storeMessage'])->name('messages.store');
    Route::post('/conversations/{conversation}/delivered', [SupportController::class, 'markDelivered'])->name('messages.delivered');
    Route::post('/conversations/{conversation}/read', [SupportController::class, 'markRead'])->name('messages.read');
    Route::post('/conversations/{conversation}/typing', [SupportController::class, 'typing'])->name('typing');
});

Route::middleware(['auth', EnsureStaff::class])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', fn () => redirect()->route(StaffHome::routeName()))->name('home');

    Route::get('/dashboard', AdminDashboardController::class)->name('dashboard');

    Route::get('/conversations', [AdminConversationController::class, 'index'])->name('conversations.index');
    Route::post('/conversations/{conversation}/assign', [AdminConversationController::class, 'assign'])->name('conversations.assign');
    Route::post('/conversations/{conversation}/ai', [AdminConversationController::class, 'toggleAi'])->name('conversations.ai');
    Route::post('/conversations/{conversation}/reopen', [AdminConversationController::class, 'reopen'])->name('conversations.reopen');

    Route::get('/chats', [AdminChatController::class, 'index'])->name('chats.index');
    Route::get('/chats/{conversation}', [AdminChatController::class, 'show'])->name('chats.show');
    Route::post('/chats/{conversation}/messages', [AdminChatController::class, 'storeMessage'])->name('chats.messages.store');
    Route::post('/chats/{conversation}/delivered', [AdminChatController::class, 'markDelivered'])->name('chats.delivered');
    Route::post('/chats/{conversation}/read', [AdminChatController::class, 'markRead'])->name('chats.read');
    Route::post('/chats/{conversation}/typing', [AdminChatController::class, 'typing'])->name('chats.typing');
    Route::post('/chats/{conversation}/close', [AdminChatController::class, 'close'])->name('chats.close');

    Route::middleware(EnsureAdmin::class)->group(function () {
        Route::get('/customers', [AdminCustomerController::class, 'index'])->name('customers.index');
        Route::put('/customers/{customer}', [AdminCustomerController::class, 'update'])->name('customers.update');

        Route::get('/intakes', [AdminIntakeController::class, 'index'])->name('intakes.index');
        Route::get('/intakes/export', [AdminIntakeController::class, 'export'])->name('intakes.export');

        Route::get('/agents', [AdminAgentController::class, 'index'])->name('agents.index');
        Route::post('/agents', [AdminAgentController::class, 'store'])->name('agents.store');
        Route::put('/agents/{agent}', [AdminAgentController::class, 'update'])->name('agents.update');

        Route::get('/settings', [AdminSettingsController::class, 'edit'])->name('settings.edit');
        Route::put('/settings', [AdminSettingsController::class, 'update'])->name('settings.update');
    });
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', function () {
        if (auth()->user()->isStaff()) {
            return redirect()->route(StaffHome::routeName());
        }

        if (auth()->user()->isCustomer()) {
            return redirect()->route('support.index');
        }

        return redirect()->route('home');
    })->name('dashboard');
});

require __DIR__.'/settings.php';
