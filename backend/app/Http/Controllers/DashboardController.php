<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Models\Allocation;
use App\Models\Booking;
use App\Models\AssetTransfer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Get KPI summary metrics for dashboard cards.
     */
    public function getKpis(Request $request)
    {
        $today = Carbon::today()->toDateString();

        $totalAssets = Asset::count();
        $availableAssets = Asset::where('status', 'Available')->count();
        $allocatedAssets = Asset::where('status', 'Allocated')->count();
        $maintenanceAssets = Asset::where('status', 'Under Maintenance')->count();
        
        $activeBookings = Booking::whereIn('status', ['Upcoming', 'Ongoing'])->count();
        $pendingTransfers = AssetTransfer::where('status', 'Requested')->count();

        // Upcoming returns (Active allocations returning today or in the future)
        $upcomingReturnsCount = Allocation::where('status', 'Active')
            ->whereNotNull('expected_return')
            ->where('expected_return', '>=', $today)
            ->count();

        // Overdue returns (Active allocations past expected return date, or status explicitly 'Overdue')
        $overdueQuery = Allocation::where(function ($query) use ($today) {
            $query->where('status', 'Overdue')
                  ->orWhere(function ($q) use ($today) {
                      $q->where('status', 'Active')
                        ->whereNotNull('expected_return')
                        ->where('expected_return', '<', $today);
                  });
        });

        $overdueReturnsCount = $overdueQuery->count();
        $overdueReturns = $overdueQuery->with(['asset', 'user', 'department'])->get();

        return response()->json([
            'total_assets' => $totalAssets,
            'available_assets' => $availableAssets,
            'allocated_assets' => $allocatedAssets,
            'maintenance_assets' => $maintenanceAssets,
            'active_bookings' => $activeBookings,
            'pending_transfers' => $pendingTransfers,
            'upcoming_returns' => $upcomingReturnsCount,
            'overdue_returns_count' => $overdueReturnsCount,
            'overdue_returns' => $overdueReturns,
        ]);
    }

    /**
     * Get aggregated analytics for heatmaps, retirement, idle items, and utilization.
     */
    public function getAnalytics(Request $request)
    {
        $driver = DB::connection()->getDriverName();

        // 1. Hourly booking density grouping by day-of-week and hour-of-day
        if ($driver === 'sqlite') {
            $bookingDensity = Booking::selectRaw("CAST(strftime('%w', start_datetime) AS INTEGER) + 1 as day_of_week, CAST(strftime('%H', start_datetime) AS INTEGER) as hour_of_day, COUNT(*) as booking_count")
                ->where('status', '!=', 'Cancelled')
                ->groupBy('day_of_week', 'hour_of_day')
                ->get();
        } else {
            $bookingDensity = Booking::selectRaw('DAYOFWEEK(start_datetime) as day_of_week, HOUR(start_datetime) as hour_of_day, COUNT(*) as booking_count')
                ->where('status', '!=', 'Cancelled')
                ->groupBy('day_of_week', 'hour_of_day')
                ->get();
        }

        // 2. Idle assets (zero bookings or allocations in the last 30 or 60 days)
        $days = (int) $request->query('days', 30);
        $cutoffDate = Carbon::now()->subDays($days);

        $idleAssets = Asset::whereNotExists(function ($query) use ($cutoffDate) {
                $query->selectRaw(1)
                    ->from('allocations')
                    ->whereColumn('allocations.asset_id', 'assets.id')
                    ->where('allocated_date', '>=', $cutoffDate);
            })
            ->whereNotExists(function ($query) use ($cutoffDate) {
                $query->selectRaw(1)
                    ->from('bookings')
                    ->whereColumn('bookings.resource_id', 'assets.id')
                    ->where('start_datetime', '>=', $cutoffDate);
            })
            ->with(['category', 'department'])
            ->get();

        // 3. Nearing retirement assets (e.g. Laptops > 3 years old)
        $retirementCutoff = Carbon::now()->subYears(3);
        $retiringAssets = Asset::where('acquisition_date', '<=', $retirementCutoff)
            ->whereNotIn('status', ['Retired', 'Disposed'])
            ->with(['category', 'department'])
            ->get();

        // 4. Maintenance frequency by asset category
        $maintenanceByCategory = DB::table('maintenance_requests')
            ->join('assets', 'maintenance_requests.asset_id', '=', 'assets.id')
            ->join('categories', 'assets.category_id', '=', 'categories.id')
            ->selectRaw('categories.name as category_name, COUNT(maintenance_requests.id) as count')
            ->groupBy('categories.name')
            ->get();

        // 5. Department-wise active allocation summary
        $departmentAllocations = DB::table('allocations')
            ->join('departments', 'allocations.department_id', '=', 'departments.id')
            ->selectRaw('departments.name as department_name, COUNT(allocations.id) as count')
            ->where('allocations.status', 'Active')
            ->groupBy('departments.name')
            ->get();

        // 6. Most-used assets (split by bookable and non-bookable)
        $mostUsedBookable = Asset::where('is_bookable', true)
            ->withCount(['bookings' => function ($q) {
                $q->where('status', '!=', 'Cancelled');
            }])
            ->orderByDesc('bookings_count')
            ->take(5)
            ->get();

        $mostUsedAllocated = Asset::where('is_bookable', false)
            ->withCount('allocations')
            ->orderByDesc('allocations_count')
            ->take(5)
            ->get();

        return response()->json([
            'booking_density' => $bookingDensity,
            'idle_assets' => $idleAssets,
            'retiring_assets' => $retiringAssets,
            'maintenance_by_category' => $maintenanceByCategory,
            'department_allocations' => $departmentAllocations,
            'most_used_bookable' => $mostUsedBookable,
            'most_used_allocated' => $mostUsedAllocated,
        ]);
    }
}
