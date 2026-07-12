<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Http\Requests\StoreAssetRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class AssetController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Asset::class);

        $user = $request->user();
        $query = Asset::with(['category', 'department', 'holder']);

        // Scope directory lists by user roles
        if ($user->isEmployee()) {
            $query->where('holder_id', $user->id);
        } elseif ($user->isDeptHead()) {
            $query->where(function ($q) use ($user) {
                $q->where('holder_id', $user->id)
                  ->orWhere('department_id', $user->department_id);
            });
        }

        // Apply filters & search scopes
        $query->search($request->query('search'))
              ->category($request->query('category_id'))
              ->status($request->query('status'))
              ->condition($request->query('condition'));

        $assets = $query->get();

        return response()->json($assets);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreAssetRequest $request)
    {
        Gate::authorize('create', Asset::class);

        $validated = $request->validated();

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('assets', 'public');
            $validated['photo_path'] = $path;
        }

        $asset = Asset::create($validated);

        return response()->json($asset->load(['category', 'department', 'holder']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Asset $asset)
    {
        Gate::authorize('view', $asset);

        return response()->json($asset->load(['category', 'department', 'holder']));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(StoreAssetRequest $request, Asset $asset)
    {
        Gate::authorize('update', $asset);

        $validated = $request->validated();

        if ($request->hasFile('photo')) {
            // Delete old photo if it exists
            if ($asset->photo_path) {
                Storage::disk('public')->delete($asset->photo_path);
            }
            $path = $request->file('photo')->store('assets', 'public');
            $validated['photo_path'] = $path;
        }

        $asset->update($validated);

        return response()->json($asset->load(['category', 'department', 'holder']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Asset $asset)
    {
        Gate::authorize('delete', $asset);

        // Check if asset can be deleted (cannot delete if Allocated)
        if ($asset->status === 'Allocated') {
            return response()->json([
                'message' => 'Cannot delete an asset that is currently allocated.'
            ], 400);
        }

        // Delete photo from storage if exists
        if ($asset->photo_path) {
            Storage::disk('public')->delete($asset->photo_path);
        }

        $asset->delete();

        return response()->json([
            'message' => 'Asset deleted successfully.'
        ]);
    }

    /**
     * Retrieve chronological history log of the asset.
     */
    public function history($id)
    {
        $asset = Asset::findOrFail($id);

        Gate::authorize('view', $asset);

        // Fetch allocations
        $allocations = \App\Models\Allocation::where('asset_id', $asset->id)
            ->with(['user', 'department'])
            ->get()
            ->map(function ($allocation) {
                return [
                    'type' => 'allocation',
                    'date' => $allocation->allocated_date->toIso8601String(),
                    'status' => $allocation->status,
                    'description' => "Allocated to " . ($allocation->user->name ?? 'Unknown') . " (" . ($allocation->department->name ?? 'No Dept') . ")",
                    'details' => $allocation->condition_notes ? "Notes: {$allocation->condition_notes}" : null,
                    'user' => $allocation->user->name ?? 'System',
                ];
            });

        // Fetch transfers
        $transfers = \App\Models\AssetTransfer::where('asset_id', $asset->id)
            ->with(['fromUser', 'toUser', 'approvedBy'])
            ->get()
            ->map(function ($transfer) {
                return [
                    'type' => 'transfer',
                    'date' => $transfer->created_at->toIso8601String(),
                    'status' => $transfer->status,
                    'description' => "Transferred from " . ($transfer->fromUser->name ?? 'Unknown') . " to " . ($transfer->toUser->name ?? 'Unknown'),
                    'details' => "Reason: {$transfer->reason}" . ($transfer->approvedBy ? " (Approved by {$transfer->approvedBy->name})" : ""),
                    'user' => $transfer->toUser->name ?? 'System',
                ];
            });

        // Fetch maintenance requests
        $maintenance = \App\Models\MaintenanceRequest::where('asset_id', $asset->id)
            ->with(['user', 'technician'])
            ->get()
            ->map(function ($req) {
                return [
                    'type' => 'maintenance',
                    'date' => $req->created_at->toIso8601String(),
                    'status' => $req->status,
                    'description' => "Maintenance request raised: {$req->issue_description}",
                    'details' => $req->resolution_notes ? "Resolution: {$req->resolution_notes} on " . ($req->resolution_date ? $req->resolution_date->toDateString() : '') : "Priority: {$req->priority}",
                    'user' => $req->user->name ?? 'System',
                ];
            });

        // Combine and sort by date descending
        $timeline = collect()
            ->concat($allocations)
            ->concat($transfers)
            ->concat($maintenance)
            ->sortByDesc('date')
            ->values();

        return response()->json([
            'asset' => $asset,
            'timeline' => $timeline
        ]);
    }
}
