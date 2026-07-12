<?php

namespace App\Policies;

use App\Models\MaintenanceRequest;
use App\Models\User;

class MaintenanceRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, MaintenanceRequest $request): bool
    {
        if ($user->isEmployee()) {
            return $request->user_id === $user->id || $request->technician_id === $user->id;
        }

        if ($user->isDeptHead()) {
            return $request->user_id === $user->id || $request->technician_id === $user->id ||
                   ($request->asset && $request->asset->department_id === $user->department_id);
        }

        return true;
    }

    public function create(User $user): bool
    {
        return true; // Any authenticated user can raise a request
    }

    public function update(User $user, MaintenanceRequest $request): bool
    {
        // Assigned technician (Employee) can update status to resolve
        if ($user->isEmployee()) {
            return $request->technician_id === $user->id;
        }

        // Department Head can update if raised in their department
        if ($user->isDeptHead()) {
            return $request->user_id === $user->id || ($request->asset && $request->asset->department_id === $user->department_id);
        }

        // Asset Managers & Admins have full access to assign/approve/resolve
        return $user->isAssetManager() || $user->isAdmin();
    }

    public function delete(User $user, MaintenanceRequest $request): bool
    {
        return $user->isAssetManager() || $user->isAdmin();
    }
}
