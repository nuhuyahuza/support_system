<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureStaff
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isStaff()) {
            if ($user?->isCustomer()) {
                return redirect()->route('support.index');
            }

            return redirect()->route('login');
        }

        return $next($request);
    }
}
