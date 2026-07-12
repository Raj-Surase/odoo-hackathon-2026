<?php

namespace App\Policies;

use App\Models\Notification;
use App\Models\User;

class NotificationPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Notification $notification): bool
    {
        return $notification->recipient_id === $user->id;
    }

    public function create(User $user): bool
    {
        return true; // System or users can trigger notifications
    }

    public function update(User $user, Notification $notification): bool
    {
        return $notification->recipient_id === $user->id;
    }

    public function delete(User $user, Notification $notification): bool
    {
        return $notification->recipient_id === $user->id;
    }
}
