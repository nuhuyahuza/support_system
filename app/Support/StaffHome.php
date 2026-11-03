<?php

namespace App\Support;

use App\Models\User;
use App\Services\Settings\SupportSettings;

class StaffHome
{
    public static function routeName(?User $user = null): string
    {
        $user ??= auth()->user();

        if (! $user?->isStaff()) {
            return 'home';
        }

        if ($user->isAdmin()) {
            return 'admin.dashboard';
        }

        $mode = app(SupportSettings::class)->agentUiMode();

        return $mode === 'whatsapp' ? 'admin.chats.index' : 'admin.dashboard';
    }

    public static function path(?User $user = null): string
    {
        return route(self::routeName($user), absolute: false);
    }

    public static function usesDashboardUi(?User $user = null): bool
    {
        $user ??= auth()->user();

        if (! $user?->isStaff()) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        return app(SupportSettings::class)->agentUiMode() === 'dashboard';
    }

    public static function usesWhatsappUi(?User $user = null): bool
    {
        $user ??= auth()->user();

        return $user?->isAgent() === true
            && app(SupportSettings::class)->agentUiMode() === 'whatsapp';
    }
}
