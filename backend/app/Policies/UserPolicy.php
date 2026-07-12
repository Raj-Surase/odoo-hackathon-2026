<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Log;

class UserPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // Any logged-in user can view directory
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, User $model): bool
    {
        return true;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, User $model): Response
    {
        // Prevent self-role elevation
        if ($user->id === $model->id) {
            if (request()->has('role') && request()->input('role') !== $model->role) {
                Log::warning('Security Alert: Self-role-elevation attempted', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'current_role' => $model->role,
                    'attempted_role' => request()->input('role'),
                    'ip' => request()->ip(),
                ]);
                return Response::deny('You cannot change your own role.', 403);
            }
            return Response::allow();
        }

        // Only Admin can update other users (including elevating roles)
        return $user->isAdmin() ? Response::allow() : Response::deny('Only system administrators can modify other employee accounts.', 403);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, User $model): bool
    {
        return $user->isAdmin();
    }
}
