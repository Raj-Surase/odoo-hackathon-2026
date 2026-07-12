<?php

namespace App\Policies;

use App\Models\AuditCycle;
use App\Models\User;

class AuditCyclePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, AuditCycle $auditCycle): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->isAssetManager() || $user->isAdmin();
    }

    public function update(User $user, AuditCycle $auditCycle): bool
    {
        return $user->isAssetManager() || $user->isAdmin();
    }

    public function delete(User $user, AuditCycle $auditCycle): bool
    {
        return $user->isAssetManager() || $user->isAdmin();
    }
}
