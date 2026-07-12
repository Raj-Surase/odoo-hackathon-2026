<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Asset;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Carbon\Carbon;

class BookingController extends Controller
{
    /**
     * Display a listing of bookings.
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Booking::class);

        $user = $request->user();
        $query = Booking::with(['resource', 'user', 'department']);

        // Scope lists by roles (unless filtering by a specific resource's schedule)
        if (!$request->has('resource_id')) {
            if ($user->isEmployee()) {
                $query->where('user_id', $user->id);
            } elseif ($user->isDeptHead()) {
                $query->where(function ($q) use ($user) {
                    $q->where('user_id', $user->id)
                      ->orWhere('department_id', $user->department_id)
                      ->orWhereHas('user', function ($uq) use ($user) {
                          $uq->where('department_id', $user->department_id);
                      });
                });
            }
        } else {
            $query->where('resource_id', $request->resource_id);
        }

        return response()->json($query->latest()->get());
    }

    /**
     * Store a newly created booking in database.
     */
    public function store(Request $request)
    {
        Gate::authorize('create', Booking::class);

        $validated = $request->validate([
            'resource_id' => 'required|exists:assets,id',
            'start_datetime' => 'required|date',
            'end_datetime' => 'required|date|after:start_datetime',
            'purpose' => 'nullable|string',
            'department_id' => 'nullable|exists:departments,id',
        ], [
            'end_datetime.after' => 'End time must be after start time.',
        ]);

        $resource = Asset::findOrFail($validated['resource_id']);
        $user = $request->user();

        // Check if resource is bookable
        if (!$resource->is_bookable) {
            return response()->json([
                'message' => 'This asset is not available for booking.'
            ], 422);
        }

        $newStart = Carbon::parse($validated['start_datetime']);
        $newEnd = Carbon::parse($validated['end_datetime']);

        // Check if booking in the past
        if ($newStart->isPast()) {
            return response()->json([
                'message' => 'Cannot book a time slot in the past.'
            ], 422);
        }

        // Conflict / Overlap validation algorithm
        $overlapExists = Booking::where('resource_id', $resource->id)
            ->where('status', '!=', 'Cancelled')
            ->where('start_datetime', '<', $newEnd)
            ->where('end_datetime', '>', $newStart)
            ->exists();

        if ($overlapExists) {
            return response()->json([
                'message' => 'Conflict - slot is unavailable.'
            ], 422);
        }

        // Create booking
        $booking = Booking::create([
            'resource_id' => $resource->id,
            'user_id' => $user->id,
            'department_id' => $validated['department_id'] ?? $user->department_id,
            'start_datetime' => $newStart,
            'end_datetime' => $newEnd,
            'purpose' => $validated['purpose'] ?? null,
            'status' => 'Upcoming',
        ]);

        // Send confirmation notification
        event(new \App\Events\BookingConfirmed($booking));

        return response()->json($booking->load(['resource', 'user', 'department']), 201);
    }

    /**
     * Cancel an upcoming booking.
     */
    public function cancel(Request $request, Booking $booking)
    {
        Gate::authorize('update', $booking);

        $user = $request->user();

        // Enforce that only the booker or an Admin/Asset Manager can cancel a booking
        if ($booking->user_id !== $user->id && !$user->isAdmin() && !$user->isAssetManager()) {
            return response()->json([
                'message' => 'This action is unauthorized.'
            ], 403);
        }

        if ($booking->status === 'Cancelled') {
            return response()->json([
                'message' => 'Booking is already cancelled.'
            ], 422);
        }

        if ($booking->status !== 'Upcoming') {
            return response()->json([
                'message' => 'Only upcoming bookings can be cancelled.'
            ], 422);
        }

        if ($booking->start_datetime->isPast()) {
            return response()->json([
                'message' => 'Cannot cancel a booking that has already started.'
            ], 422);
        }

        $booking->update([
            'status' => 'Cancelled',
        ]);

        // Dispatch cancellation notification
        Notification::create([
            'recipient_id' => $booking->user_id,
            'type' => 'Alert',
            'title' => 'Booking Cancelled',
            'message' => "Booking for " . ($booking->resource->name ?? 'Resource') . " on " . $booking->start_datetime->format('Y-m-d') . " has been cancelled.",
            'reference_type' => Booking::class,
            'reference_id' => $booking->id,
            'is_read' => false,
        ]);

        return response()->json($booking->load(['resource', 'user', 'department']));
    }
}
