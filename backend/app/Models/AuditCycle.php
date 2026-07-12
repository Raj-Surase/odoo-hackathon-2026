<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;

class AuditCycle extends Model
{
    use HasFactory, Auditable;

    protected $fillable = [
        'name',
        'department_id',
        'location',
        'start_date',
        'end_date',
        'status',
        'is_locked',
    ];

    protected $casts = [
        'is_locked' => 'boolean',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function auditors()
    {
        return $this->belongsToMany(User::class, 'audit_cycle_auditor');
    }

    public function lines()
    {
        return $this->hasMany(AuditLine::class);
    }

    public function discrepancyReports()
    {
        return $this->hasMany(DiscrepancyReport::class);
    }
}
