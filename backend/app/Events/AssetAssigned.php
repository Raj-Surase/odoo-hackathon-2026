<?php

namespace App\Events;

use App\Models\Allocation;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AssetAssigned
{
    use Dispatchable, SerializesModels;

    public Allocation $allocation;

    /**
     * Create a new event instance.
     */
    public function __construct(Allocation $allocation)
    {
        $this->allocation = $allocation;
    }
}
