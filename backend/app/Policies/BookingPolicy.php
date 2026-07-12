<?php

namespace App\Policies;

use App\Models\Booking;
use App\Models\User;

class BookingPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Booking $booking): bool
    {
        if ($user->isEmployee()) {
            return $booking->user_id === $user->id;
        }

        if ($user->isDeptHead()) {
            return $booking->user_id === $user->id || $booking->department_id === $user->department_id || ($booking->user && $booking->user->department_id === $user->department_id);
        }

        return true;
    }

    public function create(User $user): bool
    {
        return true; // Any authenticated user can create bookings
    }

    public function update(User $user, Booking $booking): bool
    {
        if ($user->isEmployee()) {
            return $booking->user_id === $user->id;
        }

        if ($user->isDeptHead()) {
            return $booking->user_id === $user->id || $booking->department_id === $user->department_id || ($booking->user && $booking->user->department_id === $user->department_id);
        }

        return $user->isAssetManager() || $user->isAdmin();
    }

    public function delete(User $user, Booking $booking): bool
    {
        return $this->update($user, $booking);
    }
}
