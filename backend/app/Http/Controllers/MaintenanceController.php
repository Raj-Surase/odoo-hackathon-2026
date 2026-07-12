<?php

namespace App\Http\Controllers;

use App\Models\MaintenanceRequest;
use App\Models\Asset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class MaintenanceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = MaintenanceRequest::with(['asset', 'user', 'technician', 'approvedBy']);

        // Role-based scope restrictions
        if ($user->isEmployee()) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhere('technician_id', $user->id);
            });
        } elseif ($user->isDeptHead()) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhere('technician_id', $user->id)
                  ->orWhereHas('asset', function ($qa) use ($user) {
                      $qa->where('department_id', $user->department_id);
                  });
            });
        }

        // Apply filters if provided
        if ($request->filled('asset_id')) {
            $query->where('asset_id', $request->query('asset_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $requests = $query->latest()->get();

        return response()->json($requests);
    }

    /**
     * Display Kanban board grouping.
     */
    public function kanban(Request $request)
    {
        $user = $request->user();
        $query = MaintenanceRequest::with(['asset', 'user', 'technician', 'approvedBy']);

        // Role-based scope restrictions
        if ($user->isEmployee()) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhere('technician_id', $user->id);
            });
        } elseif ($user->isDeptHead()) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhere('technician_id', $user->id)
                  ->orWhereHas('asset', function ($qa) use ($user) {
                      $qa->where('department_id', $user->department_id);
                  });
            });
        }

        $requests = $query->latest()->get();
        $grouped = $requests->groupBy('status');
        
        $columns = ['Pending', 'Approved', 'Technician Assigned', 'In Progress', 'Resolved'];
        $response = [];

        foreach ($columns as $column) {
            $response[$column] = $grouped->get($column, collect());
        }

        return response()->json($response);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        Gate::authorize('create', MaintenanceRequest::class);

        $validated = $request->validate([
            'asset_id' => 'required|exists:assets,id',
            'priority' => 'required|string|in:Low,Medium,High',
            'issue_description' => 'required|string',
            'photo' => 'sometimes|nullable|image|max:2048',
        ]);

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('maintenance', 'public');
        }

        $maintenanceRequest = MaintenanceRequest::create([
            'asset_id' => $validated['asset_id'],
            'user_id' => $request->user()->id,
            'issue_description' => $validated['issue_description'],
            'priority' => $validated['priority'],
            'photo_path' => $photoPath,
            'status' => 'Pending',
        ]);

        return response()->json($maintenanceRequest->load(['asset', 'user', 'technician', 'approvedBy']), 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, MaintenanceRequest $maintenanceRequest)
    {
        Gate::authorize('update', $maintenanceRequest);

        $validated = $request->validate([
            'status' => 'sometimes|required|string|in:Pending,Approved,Technician Assigned,In Progress,Resolved',
            'technician_id' => 'sometimes|nullable|exists:users,id',
            'resolution_notes' => 'sometimes|nullable|string',
            'priority' => 'sometimes|required|string|in:Low,Medium,High',
            'issue_description' => 'sometimes|required|string',
        ]);

        // State changes and side effects
        if (isset($validated['status'])) {
            $newStatus = $validated['status'];
            $oldStatus = $maintenanceRequest->status;

            if ($newStatus === 'Approved') {
                $maintenanceRequest->approved_by = $request->user()->id;
            }

            if ($newStatus === 'Technician Assigned') {
                if (isset($validated['technician_id'])) {
                    $maintenanceRequest->technician_id = $validated['technician_id'];
                }
                if (!$maintenanceRequest->approved_by) {
                    $maintenanceRequest->approved_by = $request->user()->id;
                }
            }

            if ($newStatus === 'Resolved') {
                $maintenanceRequest->resolution_date = now();
                $maintenanceRequest->resolution_notes = $validated['resolution_notes'] ?? $maintenanceRequest->resolution_notes ?? 'Resolved';
            }
        }

        // Update basic attributes if present
        $maintenanceRequest->fill($validated);
        $maintenanceRequest->save();

        return response()->json($maintenanceRequest->load(['asset', 'user', 'technician', 'approvedBy']));
    }
}
