<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Booking;
use App\Models\Notification;
use Carbon\Carbon;

class UpdateBookingsAndRemind extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'bookings:update-and-remind';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update booking statuses and send 15-minute booking reminders.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $now = Carbon::now();

        // 1. Transition Upcoming -> Ongoing if current time is past start time
        $upcomingToOngoing = Booking::where('status', 'Upcoming')
            ->where('start_datetime', '<=', $now)
            ->get();

        $ongoingCount = 0;
        foreach ($upcomingToOngoing as $booking) {
            $booking->update(['status' => 'Ongoing']);
            $ongoingCount++;
        }

        // 2. Transition Ongoing -> Completed if current time is past end time
        $ongoingToCompleted = Booking::where('status', 'Ongoing')
            ->where('end_datetime', '<=', $now)
            ->get();

        $completedCount = 0;
        foreach ($ongoingToCompleted as $booking) {
            $booking->update(['status' => 'Completed']);
            $completedCount++;
        }

        // 3. Send reminders for bookings starting in next 15 minutes
        $remindWindowStart = $now;
        $remindWindowEnd = $now->copy()->addMinutes(15);

        $bookingsToRemind = Booking::where('status', 'Upcoming')
            ->whereBetween('start_datetime', [$remindWindowStart, $remindWindowEnd])
            ->get();

        $reminderCount = 0;
        foreach ($bookingsToRemind as $booking) {
            // Check if reminder was already sent to avoid duplicate notifications
            $alreadySent = Notification::where('recipient_id', $booking->user_id)
                ->where('reference_type', Booking::class)
                ->where('reference_id', $booking->id)
                ->where('title', 'Booking Reminder')
                ->exists();

            if (!$alreadySent) {
                Notification::create([
                    'recipient_id' => $booking->user_id,
                    'type' => 'Alert',
                    'title' => 'Booking Reminder',
                    'message' => "Your booking for " . ($booking->resource->name ?? 'Resource') . " starts in 15 minutes at " . $booking->start_datetime->format('H:i') . ".",
                    'reference_type' => Booking::class,
                    'reference_id' => $booking->id,
                    'is_read' => false,
                ]);
                $reminderCount++;
            }
        }

        $this->info("Updated {$ongoingCount} to Ongoing, {$completedCount} to Completed, and sent {$reminderCount} reminders.");
    }
}
