<?php

namespace App\Policies;

use App\Models\DiscrepancyReport;
use App\Models\User;

class DiscrepancyReportPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, DiscrepancyReport $report): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->isAssetManager() || $user->isAdmin();
    }

    public function update(User $user, DiscrepancyReport $report): bool
    {
        return $user->isAssetManager() || $user->isAdmin();
    }

    public function delete(User $user, DiscrepancyReport $report): bool
    {
        return $user->isAssetManager() || $user->isAdmin();
    }
}
