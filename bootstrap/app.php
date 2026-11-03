<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        // Cloudflare / reverse proxies terminate TLS; without this Laravel
        // generates http:// redirect targets and Inertia XHR visits fail (status 0).
        $middleware->trustProxies(at: '*');

        // Fortify owns the named route `login` at /admin/login. Without this,
        // guests hitting /support (auth middleware) get the staff email login.
        $middleware->redirectGuestsTo(function (Request $request) {
            if ($request->is('admin', 'admin/*', 'settings', 'settings/*')) {
                return '/admin/login';
            }

            return '/login';
        });

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'customer' => \App\Http\Middleware\EnsureCustomer::class,
            'staff' => \App\Http\Middleware\EnsureStaff::class,
            'admin' => \App\Http\Middleware\EnsureAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
