<?php

namespace App\Http\Controllers\Customer;

use App\Events\UserTyping;
use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\Chat\ChatService;
use App\Services\Presence\PresenceService;
use App\Services\Settings\SupportSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupportController extends Controller
{
    public function index(
        Request $request,
        ChatService $chat,
        SupportSettings $settings,
        PresenceService $presence,
    ): Response {
        $user = $request->user();
        $presence->markOnline($user);
        $conversation = $chat->ensureConversation($user);

        $messages = $conversation->messages()
            ->with('sender:id,name,role')
            ->orderBy('id')
            ->get()
            ->map(fn (Message $message) => $chat->serializeMessage($message));

        $chat->markRead($conversation, $user);

        $staffOnline = $presence->anyStaffOnline();

        return Inertia::render('customer/support', [
            'brandName' => $settings->brandName(),
            'conversation' => $chat->serializeConversation($conversation, $user),
            'messages' => $messages,
            'announcement' => Announcement::active(),
            'supportOnline' => $staffOnline,
            'supportLabel' => $staffOnline ? 'online' : ($settings->aiEnabled() ? 'AI assistant available' : 'offline'),
        ]);
    }

    public function messages(Request $request, Conversation $conversation, ChatService $chat): JsonResponse
    {
        $this->authorize('view', $conversation);

        $messages = $conversation->messages()
            ->with('sender:id,name,role')
            ->when($request->integer('after'), fn ($q, $after) => $q->where('id', '>', $after))
            ->orderBy('id')
            ->get()
            ->map(fn (Message $message) => $chat->serializeMessage($message));

        return response()->json(['messages' => $messages]);
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

        broadcast(new UserTyping(
            $conversation->id,
            $user->id,
            $user->name,
            (bool) $request->boolean('typing', true),
        ))->toOthers();

        return response()->json(['ok' => true]);
    }
}
