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
    public const BOUGHT_NOT_RECEIVED = "Bought but didn't receive the data";

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
            IntakeStatus::AwaitingIssue => $this->collectIssueChoice($conversation, $message),
            IntakeStatus::AwaitingOtherIssue => $this->collectOtherIssue($conversation, $message),
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
            return $this->completeWithoutIntake($conversation);
        }

        $parsed = $this->parsePhoneAndDataSize($message->body);

        if ($parsed === null) {
            $this->chat->sendSystem(
                $conversation,
                'Please reply in this format: 0240000000 5 (phone number, then a space, then the data size).',
            );

            return false;
        }

        $conversation->update([
            'intake_phone' => $parsed['phone'],
            'intake_data_size' => $parsed['data_size'],
            'intake_status' => IntakeStatus::AwaitingIssue,
        ]);

        $this->chat->sendSystem(
            $conversation,
            "What is the main issue? Reply with:\n1 - Bought but didn't receive the data\n2 - Other issue",
        );

        return false;
    }

    private function collectIssueChoice(Conversation $conversation, Message $message): bool
    {
        if ($this->agentTookOver($conversation, $message)) {
            return $this->completeWithoutIntake($conversation);
        }

        $choice = trim((string) $message->body);

        if ($choice === '1') {
            return $this->finalizeIntake($conversation, self::BOUGHT_NOT_RECEIVED);
        }

        if ($choice === '2') {
            $conversation->update([
                'intake_status' => IntakeStatus::AwaitingOtherIssue,
            ]);

            $this->chat->sendSystem(
                $conversation,
                'Please briefly describe the issue.',
            );

            return false;
        }

        $this->chat->sendSystem(
            $conversation,
            "Please reply with 1 or 2:\n1 - Bought but didn't receive the data\n2 - Other issue",
        );

        return false;
    }

    private function collectOtherIssue(Conversation $conversation, Message $message): bool
    {
        if ($this->agentTookOver($conversation, $message)) {
            return $this->completeWithoutIntake($conversation);
        }

        $issue = trim((string) $message->body);

        if ($issue === '') {
            $this->chat->sendSystem(
                $conversation,
                'Please briefly describe the issue.',
            );

            return false;
        }

        return $this->finalizeIntake($conversation, $issue);
    }

    private function finalizeIntake(Conversation $conversation, string $issue): bool
    {
        SupportIntake::query()->create([
            'conversation_id' => $conversation->id,
            'phone' => (string) $conversation->intake_phone,
            'data_size' => (int) $conversation->intake_data_size,
            'issue' => $issue,
        ]);

        $conversation->update([
            'intake_status' => IntakeStatus::Completed,
            'intake_phone' => null,
            'intake_data_size' => null,
        ]);

        $thankYou = 'Thank you! We have received your details.';

        if (! $this->settings->aiEnabled()) {
            $thankYou .= ' An agent will be with you shortly.';
        }

        $this->chat->sendSystem($conversation, $thankYou);

        return $this->settings->aiEnabled();
    }

    private function completeWithoutIntake(Conversation $conversation): bool
    {
        $conversation->update([
            'intake_status' => IntakeStatus::Completed,
            'intake_phone' => null,
            'intake_data_size' => null,
        ]);

        return true;
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
