<?php

namespace App\Services\Presence;

use App\Enums\UserRole;
use App\Models\User;

class PresenceService
{
    public function markOnline(User $user): void
    {
        $user->update([
            'is_online' => true,
            'last_seen_at' => now(),
        ]);
    }

    public function markOffline(User $user): void
    {
        $user->update([
            'is_online' => false,
            'last_seen_at' => now(),
        ]);
    }

    public function anyStaffOnline(): bool
    {
        return User::query()
            ->whereIn('role', [UserRole::Agent->value, UserRole::Admin->value])
            ->where('is_online', true)
            ->exists();
    }

    public function onlineStaffCount(): int
    {
        return User::query()
            ->whereIn('role', [UserRole::Agent->value, UserRole::Admin->value])
            ->where('is_online', true)
            ->count();
    }
}
