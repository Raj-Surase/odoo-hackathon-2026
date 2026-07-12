<?php
namespace App\Http\Controllers;

use App\Models\Allocation;
use App\Models\Asset;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AllocationController extends Controller
{
    /**
     * Display a listing of allocations.
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Allocation::class);

        $user = $request->user();
        $query = Allocation::with(['asset', 'user', 'department']);

        // Scope lists by roles
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

        // Apply status filter
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        return response()->json($query->latest()->get());
    }

    /**
     * Store a newly created allocation in database.
     */
    public function store(Request $request)
    {
        Gate::authorize('create', Allocation::class);

        $validated = $request->validate([
            'asset_id' => 'required|exists:assets,id',
            'user_id' => 'required|exists:users,id',
            'expected_return' => 'nullable|date|after_or_equal:today',
        ]);

        $asset = Asset::findOrFail($validated['asset_id']);
        $employee = User::findOrFail($validated['user_id']);

        // Task 6.1: Allocation Conflict Gate validation
        if ($asset->status === 'Allocated') {
            // Load current holder's name and department
            $currentHolder = $asset->holder;
            $currentDept = $currentHolder ? $currentHolder->department : null;

            return response()->json([
                'message' => 'Asset is already allocated to another employee.',
                'current_holder' => [
                    'id' => $currentHolder->id ?? null,
                    'name' => $currentHolder->name ?? 'Unknown',
                    'department' => $currentDept->name ?? 'No Department',
                ]
            ], 422);
        }

        if ($asset->status !== 'Available') {
            return response()->json([
                'message' => "Asset is currently {$asset->status} and cannot be allocated."
            ], 422);
        }

        // Create the Allocation
        $allocation = Allocation::create([
            'asset_id' => $asset->id,
            'user_id' => $employee->id,
            'department_id' => $employee->department_id,
            'allocated_date' => now(),
            'expected_return' => $validated['expected_return'] ?? null,
            'status' => 'Active',
        ]);

        // Update the Asset
        $asset->update([
            'status' => 'Allocated',
            'holder_id' => $employee->id,
            'department_id' => $employee->department_id,
        ]);

        // Dispatch Assignment Notification
        Notification::create([
            'recipient_id' => $employee->id,
            'type' => 'Alert',
            'title' => 'Asset Assigned',
            'message' => "Asset {$asset->name} ({$asset->asset_tag}) has been allocated to you.",
            'reference_type' => Asset::class,
            'reference_id' => $asset->id,
            'is_read' => false,
        ]);

        return response()->json($allocation->load(['user', 'department', 'asset']), 201);
    }

    /**
     * Check-in return of an allocated asset.
     */
    public function return(Request $request, Allocation $allocation)
    {
        Gate::authorize('update', $allocation);

        if ($allocation->status !== 'Active' && $allocation->status !== 'Overdue') {
            return response()->json([
                'message' => 'This allocation is not active and cannot be returned.'
            ], 422);
        }

        $validated = $request->validate([
            'condition' => 'required|string|in:Good,Fair,Damaged',
            'condition_notes' => 'nullable|string',
        ]);

        // Update Allocation
        $allocation->update([
            'actual_return' => now(),
            'status' => 'Returned',
            'condition_notes' => $validated['condition_notes'] ?? null,
        ]);

        // Update Asset
        $asset = $allocation->asset;
        if ($asset) {
            $asset->update([
                'status' => 'Available',
                'holder_id' => null,
                'condition' => $validated['condition'],
            ]);
        }

        // Dispatch Return Notification
        Notification::create([
            'recipient_id' => $allocation->user_id,
            'type' => 'Alert',
            'title' => 'Asset Returned',
            'message' => "Asset {$asset->name} ({$asset->asset_tag}) check-in complete. Condition marked as {$validated['condition']}.",
            'reference_type' => Asset::class,
            'reference_id' => $asset->id,
            'is_read' => false,
        ]);

        return response()->json($allocation->load(['user', 'department', 'asset']));
    }
}
