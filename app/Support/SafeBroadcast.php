<?php

namespace App\Support;

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Log;
use Throwable;

class SafeBroadcast
{
    /**
     * Broadcast an event without failing the HTTP request if Reverb/Pusher is down.
     */
    public static function event(object $event, bool $toOthers = false): void
    {
        try {
            if ($toOthers && method_exists($event, 'dontBroadcastToCurrentUser')) {
                $event->dontBroadcastToCurrentUser();
            }

            Broadcast::queue($event);
        } catch (Throwable $e) {
            Log::warning('Broadcast failed; continuing without realtime push.', [
                'event' => $event::class,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
