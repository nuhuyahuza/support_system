<?php

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('conversation.{conversationId}', function (User $user, int $conversationId) {
    $conversation = Conversation::query()->find($conversationId);

    if (! $conversation) {
        return false;
    }

    if ($user->isStaff()) {
        return ['id' => $user->id, 'name' => $user->name, 'role' => $user->role->value];
    }

    return $conversation->customer_id === $user->id
        ? ['id' => $user->id, 'name' => $user->name, 'role' => $user->role->value]
        : false;
});

Broadcast::channel('admin.inbox', function (User $user) {
    return $user->isStaff()
        ? ['id' => $user->id, 'name' => $user->name, 'role' => $user->role->value]
        : false;
});
