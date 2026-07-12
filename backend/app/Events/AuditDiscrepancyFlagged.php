<?php

namespace App\Events;

use App\Models\AuditLine;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AuditDiscrepancyFlagged
{
    use Dispatchable, SerializesModels;

    public AuditLine $auditLine;

    /**
     * Create a new event instance.
     */
    public function __construct(AuditLine $auditLine)
    {
        $this->auditLine = $auditLine;
    }
}
