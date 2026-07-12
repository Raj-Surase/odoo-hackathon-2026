<?php

namespace App\Observers;

use App\Models\MaintenanceRequest;

class MaintenanceRequestObserver
{
    /**
     * Handle the MaintenanceRequest "updated" event.
     */
    public function updated(MaintenanceRequest $maintenanceRequest): void
    {
        if ($maintenanceRequest->isDirty('status')) {
            $oldStatus = $maintenanceRequest->getOriginal('status');
            $newStatus = $maintenanceRequest->status;

            if ($oldStatus === 'Pending' && $newStatus === 'Approved') {
                $asset = $maintenanceRequest->asset;
                if ($asset) {
                    $asset->status = 'Under Maintenance';
                    $asset->save();
                }
                event(new \App\Events\MaintenanceApproved($maintenanceRequest));
            }

            if ($newStatus === 'Resolved') {
                $asset = $maintenanceRequest->asset;
                if ($asset) {
                    $asset->status = 'Available';
                    $asset->save();
                }
            }
        }
    }
}
