<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DiscrepancyReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'audit_cycle_id',
        'generated_date',
    ];

    protected $casts = [
        'generated_date' => 'datetime',
    ];

    public function auditCycle()
    {
        return $this->belongsTo(AuditCycle::class);
    }

    public function flaggedLines()
    {
        return $this->hasMany(AuditLine::class, 'audit_cycle_id', 'audit_cycle_id')
            ->whereIn('verification', ['Missing', 'Damaged']);
    }
}
