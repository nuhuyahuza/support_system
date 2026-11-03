<?php

namespace App\Services\Chat;

use App\Enums\ConversationStatus;
use App\Enums\MessageSenderType;
use App\Enums\MessageType;
use App\Enums\UserRole;
use App\Events\MessageDelivered;
use App\Events\MessageRead;
use App\Events\MessageSent;
use App\Jobs\ProcessAiFallback;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Support\SafeBroadcast;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class ChatService
{
    public function ensureConversation(User $customer): Conversation
    {
        return Conversation::query()->firstOrCreate(
            ['customer_id' => $customer->id],
            [
                'status' => ConversationStatus::Open,
                'last_message_at' => now(),
            ],
        );
    }

    public function send(
        Conversation $conversation,
        User $sender,
        ?string $body = null,
        ?UploadedFile $attachment = null,
        ?MessageSenderType $senderType = null,
    ): Message {
        $type = MessageType::Text;
        $path = null;
        $name = null;

        if ($attachment) {
            $path = $attachment->store('chat-attachments/'.$conversation->id, 'public');
            $name = $attachment->getClientOriginalName();
            $mime = $attachment->getMimeType() ?? '';
            $extension = strtolower($attachment->getClientOriginalExtension());
            $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif', 'svg'];
            $type = str_starts_with($mime, 'image/') || in_array($extension, $imageExtensions, true)
                ? MessageType::Image
                : MessageType::File;
        }

        if (! $body && ! $path) {
            abort(422, 'Message body or attachment is required.');
        }

        $senderType ??= match ($sender->role) {
            UserRole::Customer => MessageSenderType::Customer,
            UserRole::Agent, UserRole::Admin => MessageSenderType::Agent,
        };

        $message = DB::transaction(function () use ($conversation, $sender, $senderType, $body, $type, $path, $name) {
            $message = Message::query()->create([
                'conversation_id' => $conversation->id,
                'sender_id' => $sender->id,
                'sender_type' => $senderType,
                'body' => $body,
                'type' => $type,
                'attachment_path' => $path,
                'attachment_name' => $name,
            ]);

            $updates = [
                'last_message_at' => now(),
                'status' => ConversationStatus::Open,
            ];

            if ($senderType === MessageSenderType::Agent) {
                $updates['assigned_agent_id'] = $sender->id;
                $updates['ai_active'] = false;
            }

            if ($senderType === MessageSenderType::Customer) {
                // keep existing assignment
            }

            $conversation->update($updates);

            return $message->load('sender:id,name,role');
        });

        SafeBroadcast::event(new MessageSent($message), toOthers: true);

        if ($senderType === MessageSenderType::Customer) {
            $allowAi = app(IntakeAutoReplyService::class)
                ->handleAfterCustomerMessage($conversation->fresh(), $message);

            if ($allowAi) {
                ProcessAiFallback::dispatch($conversation->id, $message->id)
                    ->delay(now()->addSeconds(2));
            }
        }

        return $message;
    }

    public function sendAi(Conversation $conversation, string $body): Message
    {
        $message = Message::query()->create([
            'conversation_id' => $conversation->id,
            'sender_id' => null,
            'sender_type' => MessageSenderType::Ai,
            'body' => $body,
            'type' => MessageType::Text,
        ]);

        $conversation->update([
            'last_message_at' => now(),
            'ai_active' => true,
            'status' => ConversationStatus::Open,
        ]);

        $message->load('sender:id,name,role');
        SafeBroadcast::event(new MessageSent($message), toOthers: true);

        return $message;
    }

    public function sendSystem(Conversation $conversation, string $body): Message
    {
        $message = Message::query()->create([
            'conversation_id' => $conversation->id,
            'sender_id' => null,
            'sender_type' => MessageSenderType::System,
            'body' => $body,
            'type' => MessageType::Text,
        ]);

        $conversation->update([
            'last_message_at' => now(),
            'status' => ConversationStatus::Open,
        ]);

        $message->load('sender:id,name,role');
        SafeBroadcast::event(new MessageSent($message), toOthers: true);

        return $message;
    }

    public function markDelivered(Conversation $conversation, User $reader): void
    {
        $query = Message::query()
            ->where('conversation_id', $conversation->id)
            ->whereNull('delivered_at');

        $this->applyIncomingSenderFilter($query, $reader);

        $ids = $query->pluck('id')->all();

        if ($ids === []) {
            return;
        }

        Message::query()->whereIn('id', $ids)->update(['delivered_at' => now()]);

        SafeBroadcast::event(new MessageDelivered($conversation->id, $ids), toOthers: true);
    }

    public function markRead(Conversation $conversation, User $reader): void
    {
        $query = Message::query()
            ->where('conversation_id', $conversation->id)
            ->whereNull('read_at');

        $this->applyIncomingSenderFilter($query, $reader);

        $ids = $query->pluck('id')->all();

        if ($ids === []) {
            return;
        }

        $now = now();

        Message::query()
            ->whereIn('id', $ids)
            ->whereNull('delivered_at')
            ->update(['delivered_at' => $now]);

        Message::query()->whereIn('id', $ids)->update(['read_at' => $now]);

        SafeBroadcast::event(new MessageRead($conversation->id, $ids), toOthers: true);
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<\App\Models\Message>  $query
     */
    private function applyIncomingSenderFilter($query, User $reader): void
    {
        if ($reader->isCustomer()) {
            $query->whereIn('sender_type', [
                MessageSenderType::Agent->value,
                MessageSenderType::Ai->value,
                MessageSenderType::System->value,
            ]);

            return;
        }

        $query->where('sender_type', MessageSenderType::Customer->value);
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeConversation(Conversation $conversation, ?User $viewer = null): array
    {
        $conversation->loadMissing(['customer:id,name,phone,is_online,last_seen_at', 'latestMessage', 'assignedAgent:id,name']);

        $unread = 0;
        if ($viewer) {
            $unreadQuery = Message::query()
                ->where('conversation_id', $conversation->id)
                ->whereNull('read_at');

            if ($viewer->isCustomer()) {
                $unreadQuery->whereIn('sender_type', [
                    MessageSenderType::Agent->value,
                    MessageSenderType::Ai->value,
                    MessageSenderType::System->value,
                ]);
            } else {
                $unreadQuery->where('sender_type', MessageSenderType::Customer->value);
            }

            $unread = $unreadQuery->count();
        }

        return [
            'id' => $conversation->id,
            'status' => $conversation->status->value,
            'ai_active' => $conversation->ai_active,
            'last_message_at' => $conversation->last_message_at?->toIso8601String(),
            'customer' => [
                'id' => $conversation->customer->id,
                'name' => $conversation->customer->name,
                'phone' => $conversation->customer->phone,
                'is_online' => $conversation->customer->is_online,
                'last_seen_at' => $conversation->customer->last_seen_at?->toIso8601String(),
            ],
            'assigned_agent' => $conversation->assignedAgent ? [
                'id' => $conversation->assignedAgent->id,
                'name' => $conversation->assignedAgent->name,
            ] : null,
            'latest_message' => $conversation->latestMessage ? [
                'id' => $conversation->latestMessage->id,
                'body' => $conversation->latestMessage->body,
                'type' => $conversation->latestMessage->type->value,
                'sender_type' => $conversation->latestMessage->sender_type->value,
                'created_at' => $conversation->latestMessage->created_at?->toIso8601String(),
            ] : null,
            'unread_count' => $unread,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeMessage(Message $message): array
    {
        $message->loadMissing('sender:id,name,role');

        return [
            'id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'sender_id' => $message->sender_id,
            'sender_type' => $message->sender_type->value,
            'sender' => $message->sender ? [
                'id' => $message->sender->id,
                'name' => $message->sender->name,
                'role' => $message->sender->role->value,
            ] : null,
            'body' => $message->body,
            'type' => $message->isImageAttachment()
                ? MessageType::Image->value
                : $message->type->value,
            'attachment_path' => $message->attachment_path,
            'attachment_name' => $message->attachment_name,
            'attachment_url' => $message->attachment_url,
            'delivered_at' => $message->delivered_at?->toIso8601String(),
            'read_at' => $message->read_at?->toIso8601String(),
            'created_at' => $message->created_at?->toIso8601String(),
        ];
    }

    /**
     * @param  list<int|string>  $pendingIds
     * @return list<array{id: int, delivered_at: string|null, read_at: string|null}>
     */
    public function serializeReceipts(Conversation $conversation, array $pendingIds): array
    {
        $ids = collect($pendingIds)
            ->map(fn ($id) => (int) $id)
            ->filter(fn (int $id) => $id > 0)
            ->unique()
            ->values()
            ->all();

        if ($ids === []) {
            return [];
        }

        return Message::query()
            ->where('conversation_id', $conversation->id)
            ->whereIn('id', $ids)
            ->get(['id', 'delivered_at', 'read_at'])
            ->map(fn (Message $message) => [
                'id' => $message->id,
                'delivered_at' => $message->delivered_at?->toIso8601String(),
                'read_at' => $message->read_at?->toIso8601String(),
            ])
            ->all();
    }
}
