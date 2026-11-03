<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ConversationStatus;
use App\Enums\MessageSenderType;
use App\Events\UserTyping;
use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\Chat\ChatService;
use App\Services\Presence\PresenceService;
use App\Services\Settings\SupportSettings;
use App\Support\SafeBroadcast;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ChatController extends Controller
{
    public function index(
        Request $request,
        ChatService $chat,
        PresenceService $presence,
        SupportSettings $settings,
    ): Response {
        $user = $request->user();
        $presence->markOnline($user);

        $filter = $request->string('filter', 'all')->toString();
        $search = $request->string('search')->toString();

        $conversations = Conversation::query()
            ->with(['customer:id,name,phone,is_online,last_seen_at', 'latestMessage', 'assignedAgent:id,name'])
            ->when($search !== '', function ($query) use ($search) {
                $query->whereHas('customer', function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->when($filter === 'unread', function ($query) {
                $query->whereHas('messages', function ($q) {
                    $q->whereNull('read_at')
                        ->where('sender_type', MessageSenderType::Customer->value);
                });
            })
            ->when($filter === 'ai', fn ($q) => $q->where('ai_active', true))
            ->when($filter === 'mine', fn ($q) => $q->where('assigned_agent_id', $user->id))
            ->when($filter === 'open', fn ($q) => $q->where('status', ConversationStatus::Open))
            ->orderByDesc('last_message_at')
            ->get()
            ->map(fn (Conversation $conversation) => $chat->serializeConversation($conversation, $user));

        $activeId = $request->integer('conversation') ?: ($conversations[0]['id'] ?? null);
        $active = $activeId
            ? Conversation::query()->with(['customer', 'assignedAgent'])->find($activeId)
            : null;

        // Opening the inbox delivers pending customer messages (2 grey checks)
        // without marking them read unless the conversation is active.
        $undeliveredConversationIds = Message::query()
            ->whereNull('delivered_at')
            ->where('sender_type', MessageSenderType::Customer->value)
            ->distinct()
            ->pluck('conversation_id');

        foreach ($undeliveredConversationIds as $conversationId) {
            $conversation = Conversation::query()->find($conversationId);
            if ($conversation) {
                $chat->markDelivered($conversation, $user);
            }
        }

        $messages = [];
        if ($active) {
            $this->authorize('view', $active);
            $messages = $active->messages()
                ->with('sender:id,name,role')
                ->orderBy('id')
                ->get()
                ->map(fn (Message $message) => $chat->serializeMessage($message));
            $chat->markRead($active, $user);
        }

        return Inertia::render('admin/inbox', [
            'brandName' => $settings->brandName(),
            'filter' => $filter,
            'search' => $search,
            'conversations' => $conversations,
            'activeConversation' => $active ? $chat->serializeConversation($active, $user) : null,
            'messages' => $messages,
            'announcement' => Announcement::active(),
            'overview' => [
                'open' => Conversation::query()->where('status', ConversationStatus::Open)->count(),
                'waiting' => Conversation::query()
                    ->where('status', ConversationStatus::Open)
                    ->whereHas('messages', fn ($q) => $q->whereNull('read_at')->where('sender_type', MessageSenderType::Customer->value))
                    ->count(),
                'agents_online' => $presence->onlineStaffCount(),
                'ai_sessions' => Conversation::query()->where('ai_active', true)->count(),
            ],
            'settings' => $settings->all(),
            'isAdmin' => $user->isAdmin(),
        ]);
    }

    public function show(Request $request, Conversation $conversation, ChatService $chat): JsonResponse
    {
        $this->authorize('view', $conversation);

        $messages = $conversation->messages()
            ->with('sender:id,name,role')
            ->when($request->integer('after'), fn ($q, $after) => $q->where('id', '>', $after))
            ->orderBy('id')
            ->get()
            ->map(fn (Message $message) => $chat->serializeMessage($message));

        if (! $request->integer('after')) {
            $chat->markRead($conversation, $request->user());
        }

        $pending = array_filter(explode(',', $request->string('pending')->toString()));

        return response()->json([
            'conversation' => $chat->serializeConversation($conversation, $request->user()),
            'messages' => $messages,
            'receipts' => $chat->serializeReceipts($conversation, $pending),
        ]);
    }

    public function storeMessage(Request $request, Conversation $conversation, ChatService $chat): JsonResponse
    {
        $this->authorize('reply', $conversation);

        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:5000'],
            'attachment' => ['nullable', 'file', 'max:10240'],
        ]);

        $message = $chat->send(
            $conversation,
            $request->user(),
            $data['body'] ?? null,
            $request->file('attachment'),
        );

        return response()->json([
            'message' => $chat->serializeMessage($message),
        ]);
    }

    public function markDelivered(Request $request, Conversation $conversation, ChatService $chat): JsonResponse
    {
        $this->authorize('view', $conversation);
        $chat->markDelivered($conversation, $request->user());

        return response()->json(['ok' => true]);
    }

    public function markRead(Request $request, Conversation $conversation, ChatService $chat): JsonResponse
    {
        $this->authorize('view', $conversation);
        $chat->markRead($conversation, $request->user());

        return response()->json(['ok' => true]);
    }

    public function typing(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('reply', $conversation);

        /** @var User $user */
        $user = $request->user();

        SafeBroadcast::event(new UserTyping(
            $conversation->id,
            $user->id,
            $user->name,
            (bool) $request->boolean('typing', true),
        ), toOthers: true);

        return response()->json(['ok' => true]);
    }

    public function close(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('reply', $conversation);

        $conversation->update([
            'status' => ConversationStatus::Closed,
            'ai_active' => false,
        ]);

        return response()->json(['ok' => true]);
    }
}
