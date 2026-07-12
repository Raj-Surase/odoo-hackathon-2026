<?php

namespace App\Policies;

use App\Models\Allocation;
use App\Models\User;

class AllocationPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Allocation $allocation): bool
    {
        if ($user->isEmployee()) {
            return $allocation->user_id === $user->id;
        }

        if ($user->isDeptHead()) {
            return $allocation->user_id === $user->id || $allocation->department_id === $user->department_id || ($allocation->user && $allocation->user->department_id === $user->department_id);
        }

        return true;
    }

    public function create(User $user): bool
    {
        return $user->isAssetManager() || $user->isAdmin();
    }

    public function update(User $user, Allocation $allocation): bool
    {
        return $user->isAssetManager() || $user->isAdmin();
    }

    public function delete(User $user, Allocation $allocation): bool
    {
        return $user->isAssetManager() || $user->isAdmin();
    }
}
