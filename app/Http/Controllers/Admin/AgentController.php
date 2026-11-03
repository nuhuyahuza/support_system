<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class AgentController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();

        $agents = User::query()
            ->whereIn('role', [UserRole::Agent, UserRole::Admin])
            ->withCount([
                'assignedConversations as open_assigned' => fn ($q) => $q->where('status', 'open'),
            ])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (User $agent) => [
                'id' => $agent->id,
                'name' => $agent->name,
                'email' => $agent->email,
                'role' => $agent->role->value,
                'is_active' => $agent->is_active,
                'is_online' => $agent->is_online,
                'last_seen_at' => optional($agent->last_seen_at)?->toIso8601String(),
                'open_assigned' => $agent->open_assigned,
                'created_at' => optional($agent->created_at)?->toIso8601String(),
            ]);

        return Inertia::render('admin/agents', [
            'search' => $search,
            'agents' => $agents,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'role' => ['required', Rule::in([UserRole::Agent->value, UserRole::Admin->value])],
        ]);

        User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => $data['role'],
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        return back()->with('success', 'Staff member created.');
    }

    public function update(Request $request, User $agent): RedirectResponse
    {
        abort_unless($agent->isStaff(), 404);

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($agent->id)],
            'role' => ['sometimes', 'required', Rule::in([UserRole::Agent->value, UserRole::Admin->value])],
            'is_active' => ['sometimes', 'boolean'],
            'password' => ['nullable', 'confirmed', Password::defaults()],
        ]);

        if ($agent->id === $request->user()->id) {
            if (array_key_exists('role', $data) && $data['role'] !== UserRole::Admin->value) {
                return back()->withErrors(['role' => 'You cannot demote your own account.']);
            }

            if ($request->has('is_active') && ! $request->boolean('is_active')) {
                return back()->withErrors(['is_active' => 'You cannot deactivate your own account.']);
            }
        }

        $payload = collect($data)->only(['name', 'email', 'role'])->all();

        if ($request->has('is_active')) {
            $payload['is_active'] = $request->boolean('is_active');
        }

        if (! empty($data['password'])) {
            $payload['password'] = $data['password'];
        }

        if (array_key_exists('is_active', $payload) && ! $payload['is_active']) {
            $payload['is_online'] = false;
        }

        $agent->update($payload);

        return back()->with('success', 'Staff member updated.');
    }
}
