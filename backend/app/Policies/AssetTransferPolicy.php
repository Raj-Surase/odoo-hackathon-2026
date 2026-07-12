<?php

namespace App\Policies;

use App\Models\AssetTransfer;
use App\Models\User;

class AssetTransferPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, AssetTransfer $transfer): bool
    {
        if ($user->isEmployee()) {
            return $transfer->from_user_id === $user->id || $transfer->to_user_id === $user->id;
        }

        if ($user->isDeptHead()) {
            return $transfer->from_user_id === $user->id || $transfer->to_user_id === $user->id ||
                   ($transfer->asset && $transfer->asset->department_id === $user->department_id);
        }

        return true;
    }

    public function create(User $user): bool
    {
        return true; // Any authenticated user can request a transfer
    }

    public function update(User $user, AssetTransfer $transfer): bool
    {
        // Dept heads can approve if it belongs to their department or they are the recipient's department head
        if ($user->isDeptHead()) {
            return ($transfer->asset && $transfer->asset->department_id === $user->department_id);
        }

        return $user->isAssetManager() || $user->isAdmin();
    }

    public function delete(User $user, AssetTransfer $transfer): bool
    {
        return $this->update($user, $transfer);
    }
}
