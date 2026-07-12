<?php

namespace App\Events;

use App\Models\MaintenanceRequest;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MaintenanceApproved
{
    use Dispatchable, SerializesModels;

    public MaintenanceRequest $maintenanceRequest;

    /**
     * Create a new event instance.
     */
    public function __construct(MaintenanceRequest $maintenanceRequest)
    {
        $this->maintenanceRequest = $maintenanceRequest;
    }
}
