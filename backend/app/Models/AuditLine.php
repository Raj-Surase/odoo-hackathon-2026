<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'audit_cycle_id',
        'asset_id',
        'expected_location',
        'verification',
        'notes',
        'audited_by',
    ];

    public function auditCycle()
    {
        return $this->belongsTo(AuditCycle::class);
    }

    public function asset()
    {
        return $this->belongsTo(Asset::class);
    }

    public function auditedBy()
    {
        return $this->belongsTo(User::class, 'audited_by');
    }
}
