<?php

namespace App\Http\Controllers;

use App\Models\Allocation;
use App\Models\MaintenanceRequest;
use App\Models\AuditLine;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportExportController extends Controller
{
    /**
     * Export reports in CSV format.
     */
    public function export(Request $request)
    {
        $type = $request->query('type');
        
        switch ($type) {
            case 'allocations':
                return $this->exportAllocations();
            case 'maintenance':
                return $this->exportMaintenance();
            case 'audits':
                return $this->exportAudits();
            default:
                return response()->json(['message' => 'Invalid export type. Must be allocations, maintenance, or audits.'], 400);
        }
    }

    protected function exportAllocations()
    {
        $headers = [
            'Content-type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename=allocations_report_' . date('Ymd_His') . '.csv',
            'Pragma'              => 'no-cache',
            'Cache-Control'       => 'must-revalidate, post-check=0, pre-check=0',
            'Expires'             => '0'
        ];

        $callback = function() {
            $file = fopen('php://output', 'w');
            
            // CSV Header
            fputcsv($file, [
                'Allocation ID', 
                'Asset Tag', 
                'Asset Name', 
                'User Name', 
                'User Email', 
                'Department', 
                'Allocated Date', 
                'Expected Return Date', 
                'Actual Return Date', 
                'Status', 
                'Condition Notes'
            ]);

            // Retrieve all allocations ordered by allocation date descending
            $allocations = Allocation::with(['asset', 'user', 'department'])
                ->orderBy('allocated_date', 'desc')
                ->chunk(100, function($chunk) use ($file) {
                    foreach ($chunk as $alloc) {
                        fputcsv($file, [
                            $alloc->id,
                            $alloc->asset->asset_tag ?? 'N/A',
                            $alloc->asset->name ?? 'N/A',
                            $alloc->user->name ?? 'N/A',
                            $alloc->user->email ?? 'N/A',
                            $alloc->department->name ?? 'N/A',
                            $alloc->allocated_date ? $alloc->allocated_date->toDateTimeString() : 'N/A',
                            $alloc->expected_return ? $alloc->expected_return->toDateString() : 'N/A',
                            $alloc->actual_return ? $alloc->actual_return->toDateTimeString() : 'N/A',
                            $alloc->status,
                            $alloc->condition_notes ?? 'N/A'
                        ]);
                    }
                });

            fclose($file);
        };

        return new StreamedResponse($callback, 200, $headers);
    }

    protected function exportMaintenance()
    {
        $headers = [
            'Content-type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename=maintenance_report_' . date('Ymd_His') . '.csv',
            'Pragma'              => 'no-cache',
            'Cache-Control'       => 'must-revalidate, post-check=0, pre-check=0',
            'Expires'             => '0'
        ];

        $callback = function() {
            $file = fopen('php://output', 'w');
            
            // CSV Header
            fputcsv($file, [
                'Request ID', 
                'Asset Tag', 
                'Asset Name', 
                'Submitted By', 
                'Issue Description', 
                'Priority', 
                'Technician', 
                'Status', 
                'Approved By', 
                'Resolution Notes', 
                'Resolution Date'
            ]);

            // Retrieve all maintenance requests
            MaintenanceRequest::with(['asset', 'user', 'technician', 'approvedBy'])
                ->orderBy('created_at', 'desc')
                ->chunk(100, function($chunk) use ($file) {
                    foreach ($chunk as $req) {
                        fputcsv($file, [
                            $req->id,
                            $req->asset->asset_tag ?? 'N/A',
                            $req->asset->name ?? 'N/A',
                            $req->user->name ?? 'N/A',
                            $req->issue_description,
                            $req->priority,
                            $req->technician->name ?? 'Unassigned',
                            $req->status,
                            $req->approvedBy->name ?? 'N/A',
                            $req->resolution_notes ?? 'N/A',
                            $req->resolution_date ? $req->resolution_date->toDateTimeString() : 'N/A'
                        ]);
                    }
                });

            fclose($file);
        };

        return new StreamedResponse($callback, 200, $headers);
    }

    protected function exportAudits()
    {
        $headers = [
            'Content-type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename=audits_report_' . date('Ymd_His') . '.csv',
            'Pragma'              => 'no-cache',
            'Cache-Control'       => 'must-revalidate, post-check=0, pre-check=0',
            'Expires'             => '0'
        ];

        $callback = function() {
            $file = fopen('php://output', 'w');
            
            // CSV Header
            fputcsv($file, [
                'Audit Line ID', 
                'Audit Cycle Name', 
                'Asset Tag', 
                'Asset Name', 
                'Expected Location', 
                'Verification Status', 
                'Auditor Name', 
                'Notes', 
                'Audited At'
            ]);

            // Retrieve all audit lines
            AuditLine::with(['auditCycle', 'asset', 'auditor'])
                ->orderBy('created_at', 'desc')
                ->chunk(100, function($chunk) use ($file) {
                    foreach ($chunk as $line) {
                        fputcsv($file, [
                            $line->id,
                            $line->auditCycle->name ?? 'N/A',
                            $line->asset->asset_tag ?? 'N/A',
                            $line->asset->name ?? 'N/A',
                            $line->expected_location ?? 'N/A',
                            $line->verification,
                            $line->auditor->name ?? 'N/A',
                            $line->notes ?? 'N/A',
                            $line->created_at ? $line->created_at->toDateTimeString() : 'N/A'
                        ]);
                    }
                });

            fclose($file);
        };

        return new StreamedResponse($callback, 200, $headers);
    }
}
