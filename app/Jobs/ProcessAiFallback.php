<?php

namespace App\Jobs;

use App\Models\Conversation;
use App\Models\Message;
use App\Services\Ai\AiFallbackService;
use App\Services\Settings\SupportSettings;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ProcessAiFallback implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(
        public int $conversationId,
        public int $messageId,
        public bool $waitedForTimeout = false,
    ) {}

    public function handle(AiFallbackService $ai, SupportSettings $settings): void
    {
        if (! $settings->aiEnabled()) {
            return;
        }

        $conversation = Conversation::query()->find($this->conversationId);
        $message = Message::query()->find($this->messageId);

        if (! $conversation || ! $message) {
            return;
        }

        $mode = $settings->aiTriggerMode();
        $needsTimeout = in_array($mode, ['reply_timeout', 'both'], true);

        if ($needsTimeout && ! $this->waitedForTimeout) {
            $timeout = $settings->aiReplyTimeoutSeconds();

            // First attempt: if agents offline mode can fire immediately, try that.
            if ($mode === 'both' && $ai->shouldRespond($conversation, $message)) {
                $ai->respond($conversation, $message);

                return;
            }

            self::dispatch($this->conversationId, $this->messageId, true)
                ->delay(now()->addSeconds(max(1, $timeout)));

            return;
        }

        $ai->respond($conversation, $message);
    }
}
