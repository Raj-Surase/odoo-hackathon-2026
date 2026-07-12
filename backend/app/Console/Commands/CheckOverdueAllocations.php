<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Allocation;
use App\Models\Notification;
use Carbon\Carbon;

class CheckOverdueAllocations extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'allocations:check-overdue';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Scan active allocations that are past their expected return date and mark them as overdue.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $today = Carbon::today();

        $overdueAllocations = Allocation::where('status', 'Active')
            ->whereNotNull('expected_return')
            ->where('expected_return', '<', $today)
            ->whereNull('actual_return')
            ->get();

        $count = 0;
        foreach ($overdueAllocations as $allocation) {
            $allocation->update([
                'status' => 'Overdue',
            ]);

            // Dispatch overdue return notification
            Notification::create([
                'recipient_id' => $allocation->user_id,
                'type' => 'Alert',
                'title' => 'Allocation Overdue',
                'message' => "Your allocation for asset " . ($allocation->asset->name ?? 'Asset') . " was expected by " . $allocation->expected_return->format('Y-m-d') . ". Please return it immediately.",
                'reference_type' => Allocation::class,
                'reference_id' => $allocation->id,
                'is_read' => false,
            ]);

            $count++;
        }

        $this->info("Successfully marked {$count} allocations as overdue.");
    }
}
