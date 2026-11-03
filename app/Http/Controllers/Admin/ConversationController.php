<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ConversationStatus;
use App\Enums\IntakeStatus;
use App\Enums\MessageSenderType;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\Chat\ChatService;
use App\Services\Presence\PresenceService;
use App\Support\StaffHome;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ConversationController extends Controller
{
    public function index(
        Request $request,
        ChatService $chat,
        PresenceService $presence,
    ): Response|RedirectResponse {
        if (StaffHome::usesWhatsappUi($request->user())) {
            return redirect()->route('admin.chats.index');
        }

        $user = $request->user();
        $presence->markOnline($user);

        $filter = $request->string('filter', 'all')->toString();
        $search = $request->string('search')->toString();
        $status = $request->string('status')->toString();
        $assigned = $request->string('assigned')->toString();
        $from = $request->string('from')->toString();
        $to = $request->string('to')->toString();

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
            ->when($filter === 'open' || $status === 'open', fn ($q) => $q->where('status', ConversationStatus::Open))
            ->when($status === 'closed', fn ($q) => $q->where('status', ConversationStatus::Closed))
            ->when($assigned === 'unassigned', fn ($q) => $q->whereNull('assigned_agent_id'))
            ->when(is_numeric($assigned), fn ($q) => $q->where('assigned_agent_id', (int) $assigned))
            ->when($from !== '', fn ($q) => $q->whereDate('last_message_at', '>=', $from))
            ->when($to !== '', fn ($q) => $q->whereDate('last_message_at', '<=', $to))
            ->orderByDesc('last_message_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Conversation $conversation) => $chat->serializeConversation($conversation, $user));

        $activeId = $request->integer('conversation') ?: null;
        $active = $activeId
            ? Conversation::query()->with(['customer', 'assignedAgent'])->find($activeId)
            : null;

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

        $agents = User::query()
            ->whereIn('role', [UserRole::Agent, UserRole::Admin])
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'role']);

        return Inertia::render('admin/conversations', [
            'filter' => $filter,
            'search' => $search,
            'status' => $status,
            'assigned' => $assigned,
            'from' => $from,
            'to' => $to,
            'conversations' => $conversations,
            'activeConversation' => $active ? $chat->serializeConversation($active, $user) : null,
            'messages' => $messages,
            'agents' => $agents,
            'overview' => [
                'open' => Conversation::query()->where('status', ConversationStatus::Open)->count(),
                'waiting' => Conversation::query()
                    ->where('status', ConversationStatus::Open)
                    ->whereHas('messages', fn ($q) => $q->whereNull('read_at')->where('sender_type', MessageSenderType::Customer->value))
                    ->count(),
                'ai_sessions' => Conversation::query()->where('ai_active', true)->count(),
            ],
        ]);
    }

    public function assign(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('reply', $conversation);

        $data = $request->validate([
            'assigned_agent_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
        ]);

        if ($data['assigned_agent_id'] ?? null) {
            $agent = User::query()->findOrFail($data['assigned_agent_id']);
            abort_unless($agent->isStaff() && $agent->is_active, 422, 'Invalid agent.');
        }

        $conversation->update([
            'assigned_agent_id' => $data['assigned_agent_id'] ?? null,
        ]);

        return response()->json([
            'ok' => true,
            'assigned_agent_id' => $conversation->assigned_agent_id,
        ]);
    }

    public function toggleAi(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('reply', $conversation);

        $data = $request->validate([
            'ai_active' => ['required', 'boolean'],
        ]);

        $conversation->update([
            'ai_active' => $data['ai_active'],
            'status' => $data['ai_active'] ? ConversationStatus::Open : $conversation->status,
        ]);

        return response()->json([
            'ok' => true,
            'ai_active' => $conversation->ai_active,
        ]);
    }

    public function reopen(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('reply', $conversation);

        $conversation->update([
            'status' => ConversationStatus::Open,
            'intake_status' => IntakeStatus::Pending,
        ]);

        return response()->json(['ok' => true]);
    }
}
