<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ConversationStatus;
use App\Enums\MessageSenderType;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\Presence\PresenceService;
use App\Support\StaffHome;
use Carbon\CarbonInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request, PresenceService $presence): Response|RedirectResponse
    {
        if (StaffHome::usesWhatsappUi($request->user())) {
            return redirect()->route('admin.chats.index');
        }

        $days = in_array($request->integer('days'), [7, 30], true) ? $request->integer('days') : 7;
        $from = now()->subDays($days - 1)->startOfDay();

        $open = Conversation::query()->where('status', ConversationStatus::Open)->count();
        $waiting = Conversation::query()
            ->where('status', ConversationStatus::Open)
            ->whereHas('messages', fn ($q) => $q->whereNull('read_at')->where('sender_type', MessageSenderType::Customer->value))
            ->count();
        $closedToday = Conversation::query()
            ->where('status', ConversationStatus::Closed)
            ->whereDate('updated_at', today())
            ->count();
        $aiSessions = Conversation::query()->where('ai_active', true)->count();
        $customersTotal = User::query()->where('role', UserRole::Customer)->count();

        $conversationSeries = $this->dailySeries(
            Conversation::query()
                ->where('created_at', '>=', $from)
                ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
                ->groupBy('day')
                ->pluck('total', 'day')
                ->all(),
            $from,
            $days,
        );

        $messageSeries = $this->dailySeries(
            Message::query()
                ->where('created_at', '>=', $from)
                ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
                ->groupBy('day')
                ->pluck('total', 'day')
                ->all(),
            $from,
            $days,
        );

        $messagesBySender = Message::query()
            ->where('created_at', '>=', $from)
            ->select('sender_type', DB::raw('COUNT(*) as total'))
            ->groupBy('sender_type')
            ->pluck('total', 'sender_type')
            ->all();

        $statusBreakdown = [
            'open' => $open,
            'closed' => Conversation::query()->where('status', ConversationStatus::Closed)->count(),
        ];

        $agentWorkload = User::query()
            ->whereIn('role', [UserRole::Agent, UserRole::Admin])
            ->where('is_active', true)
            ->withCount([
                'assignedConversations as open_assigned' => fn ($q) => $q->where('status', ConversationStatus::Open),
            ])
            ->orderByDesc('open_assigned')
            ->limit(10)
            ->get(['id', 'name', 'role', 'is_online'])
            ->map(fn (User $agent) => [
                'id' => $agent->id,
                'name' => $agent->name,
                'role' => $agent->role->value,
                'is_online' => $agent->is_online,
                'open_assigned' => $agent->open_assigned,
            ]);

        $waitingChats = Conversation::query()
            ->with(['customer:id,name,phone', 'latestMessage'])
            ->where('status', ConversationStatus::Open)
            ->whereHas('messages', fn ($q) => $q->whereNull('read_at')->where('sender_type', MessageSenderType::Customer->value))
            ->orderByDesc('last_message_at')
            ->limit(8)
            ->get()
            ->map(fn (Conversation $conversation) => [
                'id' => $conversation->id,
                'customer' => [
                    'id' => $conversation->customer?->id,
                    'name' => $conversation->customer?->name,
                    'phone' => $conversation->customer?->phone,
                ],
                'latest_message' => $conversation->latestMessage ? [
                    'body' => $conversation->latestMessage->body,
                    'created_at' => optional($conversation->latestMessage->created_at)?->toIso8601String(),
                ] : null,
                'last_message_at' => optional($conversation->last_message_at)?->toIso8601String(),
            ]);

        return Inertia::render('admin/dashboard', [
            'days' => $days,
            'kpis' => [
                'open' => $open,
                'waiting' => $waiting,
                'closed_today' => $closedToday,
                'agents_online' => $presence->onlineStaffCount(),
                'ai_sessions' => $aiSessions,
                'customers_total' => $customersTotal,
            ],
            'series' => [
                'conversations' => $conversationSeries,
                'messages' => $messageSeries,
            ],
            'messagesBySender' => collect(MessageSenderType::cases())->map(fn (MessageSenderType $type) => [
                'type' => $type->value,
                'total' => (int) ($messagesBySender[$type->value] ?? 0),
            ])->values(),
            'statusBreakdown' => $statusBreakdown,
            'agentWorkload' => $agentWorkload,
            'waitingChats' => $waitingChats,
        ]);
    }

    /**
     * @param  array<string, int|string>  $counts
     * @return list<array{date: string, label: string, total: int}>
     */
    private function dailySeries(array $counts, CarbonInterface $from, int $days): array
    {
        $series = [];

        for ($i = 0; $i < $days; $i++) {
            $day = $from->copy()->addDays($i);
            $key = $day->toDateString();
            $series[] = [
                'date' => $key,
                'label' => $day->format('M j'),
                'total' => (int) ($counts[$key] ?? 0),
            ];
        }

        return $series;
    }
}
