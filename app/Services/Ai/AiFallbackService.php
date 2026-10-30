<?php

namespace App\Services\Ai;

use App\Contracts\AiResponder;
use App\Enums\MessageSenderType;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\Chat\ChatService;
use App\Services\Presence\PresenceService;
use App\Services\Settings\SupportSettings;
use Illuminate\Support\Facades\Log;

class AiFallbackService
{
    public function __construct(
        protected SupportSettings $settings,
        protected PresenceService $presence,
        protected ChatService $chat,
    ) {}

    public function responder(): AiResponder
    {
        if (! $this->settings->aiEnabled()) {
            return app(NullAiResponder::class);
        }

        return match ($this->settings->aiProvider()) {
            'openai' => app(OpenAiResponder::class),
            'anthropic' => app(AnthropicResponder::class),
            default => app(NullAiResponder::class),
        };
    }

    public function shouldRespond(Conversation $conversation, Message $triggerMessage): bool
    {
        if (! $this->settings->aiEnabled()) {
            return false;
        }

        if ($this->settings->aiProvider() === 'none') {
            return false;
        }

        // Newer human reply after the trigger means staff already handled it.
        $newerHuman = Message::query()
            ->where('conversation_id', $conversation->id)
            ->where('id', '>', $triggerMessage->id)
            ->where('sender_type', MessageSenderType::Agent->value)
            ->exists();

        if ($newerHuman) {
            return false;
        }

        $mode = $this->settings->aiTriggerMode();
        $staffOnline = $this->presence->anyStaffOnline();

        $offlineTrigger = in_array($mode, ['agents_offline', 'both'], true) && ! $staffOnline;
        $timeoutTrigger = false;

        if (in_array($mode, ['reply_timeout', 'both'], true)) {
            $timeout = $this->settings->aiReplyTimeoutSeconds();
            $timeoutTrigger = $triggerMessage->created_at?->lte(now()->subSeconds($timeout)) ?? false;

            // If staff are online, only timeout mode (or both) should fire after waiting.
            if ($mode === 'reply_timeout') {
                return $timeoutTrigger;
            }
        }

        if ($mode === 'agents_offline') {
            return $offlineTrigger;
        }

        // both
        return $offlineTrigger || $timeoutTrigger;
    }

    public function respond(Conversation $conversation, Message $triggerMessage): ?Message
    {
        $conversation->refresh();

        if (! $this->shouldRespond($conversation, $triggerMessage)) {
            // If only timeout path and not yet due, re-queue is handled by the job.
            return null;
        }

        $history = Message::query()
            ->where('conversation_id', $conversation->id)
            ->orderBy('id')
            ->limit(20)
            ->get()
            ->map(function (Message $message) {
                $role = $message->sender_type === MessageSenderType::Customer ? 'user' : 'assistant';

                return [
                    'role' => $role,
                    'content' => $message->body ?: ($message->attachment_name ? '[Attachment: '.$message->attachment_name.']' : '[Attachment]'),
                ];
            })
            ->filter(fn (array $m) => filled($m['content']))
            ->values()
            ->all();

        try {
            $reply = $this->responder()->reply($this->settings->aiSystemPrompt(), $history);
        } catch (\Throwable $e) {
            Log::warning('AI fallback failed', ['error' => $e->getMessage()]);
            $reply = app(NullAiResponder::class)->reply($this->settings->aiSystemPrompt(), $history);
        }

        if ($reply === '') {
            return null;
        }

        return $this->chat->sendAi($conversation, $reply);
    }
}
