<?php

namespace App\Http\Middleware;

use App\Support\StaffHome;
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
                return redirect()->route(StaffHome::routeName());
            }

            return redirect()->route('customer.login');
        }

        if ($user->is_active === false) {
            auth()->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('customer.login')->withErrors([
                'phone' => 'This account has been deactivated. Contact support.',
            ]);
        }

        return $next($request);
    }
}
