<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Response;

class ManifestController extends Controller
{
    public function __invoke(): Response
    {
        $brandName = (string) Setting::getValue(
            'brand_name',
            config('support.brand_name', config('app.name', 'Support')),
        );

        $manifest = [
            'name' => $brandName,
            'short_name' => mb_strlen($brandName) > 12
                ? mb_substr($brandName, 0, 12)
                : $brandName,
            'description' => 'Customer support chat',
            'start_url' => '/',
            'scope' => '/',
            'display' => 'standalone',
            'orientation' => 'portrait-primary',
            'background_color' => '#075e54',
            'theme_color' => '#075e54',
            'lang' => str_replace('_', '-', app()->getLocale()),
            'icons' => [
                [
                    'src' => '/pwa-192x192.png',
                    'sizes' => '192x192',
                    'type' => 'image/png',
                    'purpose' => 'any',
                ],
                [
                    'src' => '/pwa-512x512.png',
                    'sizes' => '512x512',
                    'type' => 'image/png',
                    'purpose' => 'any',
                ],
                [
                    'src' => '/pwa-maskable-512x512.png',
                    'sizes' => '512x512',
                    'type' => 'image/png',
                    'purpose' => 'maskable',
                ],
            ],
        ];

        return response(json_encode($manifest, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), 200, [
            'Content-Type' => 'application/manifest+json',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}
