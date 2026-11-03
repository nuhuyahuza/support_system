<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AllowServiceWorkerScope
{
    /**
     * Allow a service worker under /build to control the whole origin.
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $path = $request->path();

        if (str_ends_with($path, 'sw.js') || preg_match('#(^|/)workbox-[^/]+\.js$#', $path) === 1) {
            $response->headers->set('Service-Worker-Allowed', '/');
            $response->headers->set('Cache-Control', 'no-cache');
        }

        return $response;
    }
}
