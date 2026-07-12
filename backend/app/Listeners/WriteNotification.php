<?php

namespace App\Listeners;

use App\Models\Notification;
use App\Models\User;
use App\Events\AssetAssigned;
use App\Events\MaintenanceApproved;
use App\Events\BookingConfirmed;
use App\Events\TransferApproved;
use App\Events\AuditDiscrepancyFlagged;
use Carbon\Carbon;

class WriteNotification
{
    /**
     * Handle the event.
     */
    public function handle(object $event): void
    {
        if ($event instanceof AssetAssigned) {
            $allocation = $event->allocation;
            $asset = $allocation->asset;
            $employee = $allocation->user;

            if ($asset && $employee) {
                Notification::create([
                    'recipient_id' => $allocation->user_id,
                    'type' => 'asset_assigned',
                    'title' => 'Asset Assigned',
                    'message' => "{$asset->name} {$asset->asset_tag} assigned to {$employee->name}",
                    'reference_type' => get_class($allocation),
                    'reference_id' => $allocation->id,
                    'is_read' => false,
                ]);
            }
        }

        if ($event instanceof MaintenanceApproved) {
            $maintenanceRequest = $event->maintenanceRequest;
            $asset = $maintenanceRequest->asset;

            if ($asset) {
                Notification::create([
                    'recipient_id' => $maintenanceRequest->user_id,
                    'type' => 'maintenance_approved',
                    'title' => 'Maintenance Approved',
                    'message' => "Maintenance request {$asset->asset_tag} approved",
                    'reference_type' => get_class($maintenanceRequest),
                    'reference_id' => $maintenanceRequest->id,
                    'is_read' => false,
                ]);
            }
        }

        if ($event instanceof BookingConfirmed) {
            $booking = $event->booking;
            $resource = $booking->resource;

            if ($resource) {
                $start = Carbon::parse($booking->start_datetime);
                $end = Carbon::parse($booking->end_datetime);

                Notification::create([
                    'recipient_id' => $booking->user_id,
                    'type' => 'booking_confirmed',
                    'title' => 'Booking Confirmed',
                    'message' => "Booking confirmed: {$resource->name}: " . $start->format('g:i') . " to " . $end->format('g:i A'),
                    'reference_type' => get_class($booking),
                    'reference_id' => $booking->id,
                    'is_read' => false,
                ]);
            }
        }

        if ($event instanceof TransferApproved) {
            $transfer = $event->transfer;
            $asset = $transfer->asset;
            $toUser = $transfer->toUser;

            if ($asset && $toUser) {
                $toDept = $toUser->department;
                $deptName = $toDept ? $toDept->name : 'New';
                $msg = "Transfer approved: {$asset->asset_tag} to {$deptName} dept";

                // Notify new holder (recipient)
                Notification::create([
                    'recipient_id' => $transfer->to_user_id,
                    'type' => 'transfer_approved',
                    'title' => 'Asset Transfer Approved',
                    'message' => $msg,
                    'reference_type' => get_class($transfer),
                    'reference_id' => $transfer->id,
                    'is_read' => false,
                ]);

                // Notify previous holder
                Notification::create([
                    'recipient_id' => $transfer->from_user_id,
                    'type' => 'transfer_approved',
                    'title' => 'Asset Transferred Out',
                    'message' => $msg,
                    'reference_type' => get_class($transfer),
                    'reference_id' => $transfer->id,
                    'is_read' => false,
                ]);
            }
        }

        if ($event instanceof AuditDiscrepancyFlagged) {
            $auditLine = $event->auditLine;
            $asset = $auditLine->asset;

            if ($asset) {
                $verification = strtolower($auditLine->verification);
                $msg = "Audit discrepancy flagged: {$asset->asset_tag} {$verification}";

                $managers = User::whereIn('role', ['Admin', 'Asset Manager'])->get();
                foreach ($managers as $manager) {
                    Notification::firstOrCreate([
                        'recipient_id' => $manager->id,
                        'type' => 'audit_discrepancy',
                        'reference_type' => get_class($auditLine),
                        'reference_id' => $auditLine->id,
                    ], [
                        'title' => 'Audit Discrepancy Flagged',
                        'message' => $msg,
                        'is_read' => false,
                    ]);
                }
            }
        }
    }
}
