<?php

namespace App\Http\Controllers;

use App\Services\Presence\PresenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PresenceController extends Controller
{
    public function update(Request $request, PresenceService $presence): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['ok' => false], 401);
        }

        if ($request->boolean('online', true)) {
            $presence->markOnline($user);
        } else {
            $presence->markOffline($user);
        }

        return response()->json(['ok' => true]);
    }
}
