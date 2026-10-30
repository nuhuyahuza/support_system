<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCustomer
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isCustomer()) {
            if ($user?->isStaff()) {
                return redirect()->route('admin.chats.index');
            }

            return redirect()->route('customer.login');
        }

        return $next($request);
    }
}
