<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();

        $customers = User::query()
            ->where('role', UserRole::Customer)
            ->with(['conversation.latestMessage', 'conversation.assignedAgent:id,name'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('updated_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (User $customer) => [
                'id' => $customer->id,
                'name' => $customer->name,
                'phone' => $customer->phone,
                'is_active' => $customer->is_active,
                'is_online' => $customer->is_online,
                'last_seen_at' => optional($customer->last_seen_at)?->toIso8601String(),
                'created_at' => optional($customer->created_at)?->toIso8601String(),
                'conversation' => $customer->conversation ? [
                    'id' => $customer->conversation->id,
                    'status' => $customer->conversation->status->value,
                    'ai_active' => $customer->conversation->ai_active,
                    'last_message_at' => optional($customer->conversation->last_message_at)?->toIso8601String(),
                    'assigned_agent' => $customer->conversation->assignedAgent
                        ? [
                            'id' => $customer->conversation->assignedAgent->id,
                            'name' => $customer->conversation->assignedAgent->name,
                        ]
                        : null,
                    'latest_message' => $customer->conversation->latestMessage
                        ? [
                            'body' => $customer->conversation->latestMessage->body,
                            'sender_type' => $customer->conversation->latestMessage->sender_type->value,
                            'created_at' => optional($customer->conversation->latestMessage->created_at)?->toIso8601String(),
                        ]
                        : null,
                ] : null,
            ]);

        return Inertia::render('admin/customers', [
            'search' => $search,
            'customers' => $customers,
        ]);
    }

    public function update(Request $request, User $customer): RedirectResponse
    {
        abort_unless($customer->isCustomer(), 404);

        $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $isActive = $request->boolean('is_active');

        $customer->update([
            'is_active' => $isActive,
            'is_online' => $isActive ? $customer->is_online : false,
        ]);

        return back()->with('success', $isActive ? 'Customer activated.' : 'Customer deactivated.');
    }
}
