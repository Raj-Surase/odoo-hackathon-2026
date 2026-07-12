<?php

namespace App\Events;

use App\Models\AssetTransfer;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TransferApproved
{
    use Dispatchable, SerializesModels;

    public AssetTransfer $transfer;

    /**
     * Create a new event instance.
     */
    public function __construct(AssetTransfer $transfer)
    {
        $this->transfer = $transfer;
    }
}
