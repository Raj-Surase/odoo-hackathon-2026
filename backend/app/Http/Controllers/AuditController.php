<?php

namespace App\Http\Controllers;

use App\Models\AuditCycle;
use App\Models\AuditLine;
use App\Models\DiscrepancyReport;
use App\Models\Asset;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AuditController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $query = AuditCycle::with(['department', 'auditors']);
        
        if (!$user->isAdmin() && !$user->isAssetManager()) {
            $query->whereHas('auditors', function ($q) use ($user) {
                $q->where('users.id', $user->id);
            });
        }
        
        return response()->json($query->latest()->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        if (!auth()->user()->isAdmin() && !auth()->user()->isAssetManager()) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'department_id' => 'nullable|exists:departments,id',
            'location' => 'nullable|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'auditor_ids' => 'required|array',
            'auditor_ids.*' => 'exists:users,id',
        ]);
        
        $cycle = DB::transaction(function () use ($validated) {
            $cycle = AuditCycle::create([
                'name' => $validated['name'],
                'department_id' => $validated['department_id'] ?? null,
                'location' => $validated['location'] ?? null,
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'status' => 'Open',
                'is_locked' => false,
            ]);
            
            $cycle->auditors()->sync($validated['auditor_ids']);
            
            // Fetch assets matching scopes
            $assetQuery = Asset::query();
            if (!empty($validated['department_id'])) {
                $assetQuery->where('department_id', $validated['department_id']);
            }
            if (!empty($validated['location'])) {
                $assetQuery->where('location', $validated['location']);
            }
            
            $assets = $assetQuery->get();
            
            foreach ($assets as $asset) {
                AuditLine::create([
                    'audit_cycle_id' => $cycle->id,
                    'asset_id' => $asset->id,
                    'expected_location' => $asset->location,
                    'verification' => 'Verified',
                ]);
            }
            
            return $cycle;
        });
        
        return response()->json($cycle->load(['department', 'auditors', 'lines.asset']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(AuditCycle $auditCycle)
    {
        $user = auth()->user();
        
        $isAssigned = $auditCycle->auditors()->where('users.id', $user->id)->exists();
        if (!$user->isAdmin() && !$user->isAssetManager() && !$isAssigned) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }
        
        $auditCycle->load([
            'department',
            'auditors',
            'lines.asset',
            'lines.auditedBy',
            'discrepancyReports.flaggedLines.asset'
        ]);
        
        return response()->json($auditCycle);
    }

    /**
     * Update an audit line verification and notes.
     */
    public function updateLine(Request $request, AuditLine $auditLine)
    {
        $user = auth()->user();
        $cycle = $auditLine->auditCycle;
        
        if ($cycle->is_locked) {
            return response()->json(['message' => 'Cannot modify a locked audit cycle.'], 422);
        }
        
        $isAssigned = $cycle->auditors()->where('users.id', $user->id)->exists();
        if (!$user->isAdmin() && !$user->isAssetManager() && !$isAssigned) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }
        
        $validated = $request->validate([
            'verification' => 'required|string|in:Verified,Missing,Damaged',
            'notes' => 'nullable|string',
        ]);
        
        $auditLine->update([
            'verification' => $validated['verification'],
            'notes' => $validated['notes'] ?? null,
            'audited_by' => $user->id,
        ]);
        
        if (in_array($validated['verification'], ['Missing', 'Damaged'])) {
            DiscrepancyReport::firstOrCreate(
                ['audit_cycle_id' => $cycle->id],
                ['generated_date' => now()]
            );
            
            $asset = $auditLine->asset;
            $message = "Audit discrepancy flagged: {$asset->asset_tag} " . strtolower($validated['verification']);
            
            event(new \App\Events\AuditDiscrepancyFlagged($auditLine));
        } else {
            $hasDiscrepancies = AuditLine::where('audit_cycle_id', $cycle->id)
                ->whereIn('verification', ['Missing', 'Damaged'])
                ->exists();
                
            if (!$hasDiscrepancies) {
                DiscrepancyReport::where('audit_cycle_id', $cycle->id)->delete();
            }
        }
        
        return response()->json($auditLine->load('asset'));
    }

    /**
     * Close the specified audit cycle.
     */
    public function close(AuditCycle $auditCycle)
    {
        $user = auth()->user();
        if (!$user->isAdmin() && !$user->isAssetManager()) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }
        
        if ($auditCycle->is_locked) {
            return response()->json(['message' => 'Audit cycle is already closed.'], 422);
        }
        
        DB::transaction(function () use ($auditCycle) {
            $auditCycle->update([
                'status' => 'Closed',
                'is_locked' => true,
            ]);
            
            DiscrepancyReport::where('audit_cycle_id', $auditCycle->id)
                ->update(['generated_date' => now()]);
                
            $lines = $auditCycle->lines;
            foreach ($lines as $line) {
                if ($line->verification === 'Missing') {
                    $line->asset->update([
                        'status' => 'Lost',
                    ]);
                } elseif ($line->verification === 'Damaged') {
                    $line->asset->update([
                        'condition' => 'Damaged',
                    ]);
                }
            }
        });
        
        return response()->json($auditCycle->load(['department', 'auditors', 'lines.asset']));
    }
}
