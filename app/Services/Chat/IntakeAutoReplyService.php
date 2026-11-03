<?php

namespace App\Services\Chat;

use App\Enums\IntakeStatus;
use App\Enums\MessageSenderType;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\SupportIntake;
use App\Services\Settings\SupportSettings;

class IntakeAutoReplyService
{
    public function __construct(
        protected ChatService $chat,
        protected SupportSettings $settings,
    ) {}

    /**
     * Handle intake auto-replies after a customer message.
     *
     * @return bool Whether AI fallback may proceed for this message
     */
    public function handleAfterCustomerMessage(Conversation $conversation, Message $message): bool
    {
        $conversation->refresh();

        return match ($conversation->intake_status) {
            IntakeStatus::Completed => true,
            IntakeStatus::Pending => $this->greet($conversation),
            IntakeStatus::AwaitingDetails => $this->collectDetails($conversation, $message),
        };
    }

    private function greet(Conversation $conversation): bool
    {
        $this->chat->sendSystem(
            $conversation,
            'Welcome! Thanks for reaching out. Please reply with your phone number and the data size you purchased in this format: 0240000000 5',
        );

        $conversation->update([
            'intake_status' => IntakeStatus::AwaitingDetails,
        ]);

        return false;
    }

    private function collectDetails(Conversation $conversation, Message $message): bool
    {
        if ($this->agentTookOver($conversation, $message)) {
            $conversation->update([
                'intake_status' => IntakeStatus::Completed,
            ]);

            return true;
        }

        $parsed = $this->parsePhoneAndDataSize($message->body);

        if ($parsed === null) {
            $this->chat->sendSystem(
                $conversation,
                'Please reply in this format: 0240000000 5 (phone number, then a space, then the data size).',
            );

            return false;
        }

        SupportIntake::query()->create([
            'conversation_id' => $conversation->id,
            'phone' => $parsed['phone'],
            'data_size' => $parsed['data_size'],
        ]);

        $conversation->update([
            'intake_status' => IntakeStatus::Completed,
        ]);

        $thankYou = 'Thank you! We have received your details.';

        if (! $this->settings->aiEnabled()) {
            $thankYou .= ' An agent will be with you shortly.';
        }

        $this->chat->sendSystem($conversation, $thankYou);

        return $this->settings->aiEnabled();
    }

    private function agentTookOver(Conversation $conversation, Message $message): bool
    {
        $lastSystemId = Message::query()
            ->where('conversation_id', $conversation->id)
            ->where('sender_type', MessageSenderType::System->value)
            ->where('id', '<', $message->id)
            ->max('id');

        if (! $lastSystemId) {
            return false;
        }

        return Message::query()
            ->where('conversation_id', $conversation->id)
            ->where('sender_type', MessageSenderType::Agent->value)
            ->where('id', '>', $lastSystemId)
            ->where('id', '<', $message->id)
            ->exists();
    }

    /**
     * @return array{phone: string, data_size: int}|null
     */
    private function parsePhoneAndDataSize(?string $body): ?array
    {
        if ($body === null) {
            return null;
        }

        $normalized = trim(preg_replace('/\s+/', ' ', $body) ?? '');

        if (! preg_match('/^(0\d{9}) (\d+)$/', $normalized, $matches)) {
            return null;
        }

        return [
            'phone' => $matches[1],
            'data_size' => (int) $matches[2],
        ];
    }
}
