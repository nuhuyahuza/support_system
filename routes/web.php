<?php

use App\Http\Controllers\Admin\ChatController as AdminChatController;
use App\Http\Controllers\Admin\SettingsController as AdminSettingsController;
use App\Http\Controllers\Customer\AuthController as CustomerAuthController;
use App\Http\Controllers\Customer\SupportController;
use App\Http\Controllers\PresenceController;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsureCustomer;
use App\Http\Middleware\EnsureStaff;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    if (auth()->check()) {
        if (auth()->user()->isCustomer()) {
            return redirect()->route('support.index');
        }

        if (auth()->user()->isStaff()) {
            return redirect()->route('admin.chats.index');
        }
    }

    return redirect()->route('customer.login');
})->name('home');

Route::middleware('guest')->group(function () {
    Route::get('/support/login', [CustomerAuthController::class, 'create'])->name('customer.login');
    Route::post('/support/login/phone', [CustomerAuthController::class, 'storePhone'])->name('customer.login.phone');
    Route::post('/support/login/back', [CustomerAuthController::class, 'backToPhone'])->name('customer.login.back');
    Route::post('/support/login', [CustomerAuthController::class, 'store'])->name('customer.login.store');
    Route::get('/support/verify', [CustomerAuthController::class, 'showVerify'])->name('customer.verify');
    Route::post('/support/verify', [CustomerAuthController::class, 'verify'])->name('customer.verify.store');
});

Route::post('/support/logout', [CustomerAuthController::class, 'destroy'])
    ->middleware('auth')
    ->name('customer.logout');

Route::post('/presence', [PresenceController::class, 'update'])
    ->middleware('auth')
    ->name('presence.update');

Route::middleware(['auth', EnsureCustomer::class])->prefix('support')->name('support.')->group(function () {
    Route::get('/', [SupportController::class, 'index'])->name('index');
    Route::get('/conversations/{conversation}/messages', [SupportController::class, 'messages'])->name('messages');
    Route::post('/conversations/{conversation}/messages', [SupportController::class, 'storeMessage'])->name('messages.store');
    Route::post('/conversations/{conversation}/read', [SupportController::class, 'markRead'])->name('messages.read');
    Route::post('/conversations/{conversation}/typing', [SupportController::class, 'typing'])->name('typing');
});

Route::middleware(['auth', EnsureStaff::class])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', fn () => redirect()->route('admin.chats.index'))->name('home');
    Route::get('/chats', [AdminChatController::class, 'index'])->name('chats.index');
    Route::get('/chats/{conversation}', [AdminChatController::class, 'show'])->name('chats.show');
    Route::post('/chats/{conversation}/messages', [AdminChatController::class, 'storeMessage'])->name('chats.messages.store');
    Route::post('/chats/{conversation}/read', [AdminChatController::class, 'markRead'])->name('chats.read');
    Route::post('/chats/{conversation}/typing', [AdminChatController::class, 'typing'])->name('chats.typing');
    Route::post('/chats/{conversation}/close', [AdminChatController::class, 'close'])->name('chats.close');

    Route::middleware(EnsureAdmin::class)->group(function () {
        Route::get('/settings', [AdminSettingsController::class, 'edit'])->name('settings.edit');
        Route::put('/settings', [AdminSettingsController::class, 'update'])->name('settings.update');
    });
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', function () {
        if (auth()->user()->isStaff()) {
            return redirect()->route('admin.chats.index');
        }

        if (auth()->user()->isCustomer()) {
            return redirect()->route('support.index');
        }

        return redirect()->route('home');
    })->name('dashboard');
});

require __DIR__.'/settings.php';
