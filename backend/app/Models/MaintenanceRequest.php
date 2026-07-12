<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;

class MaintenanceRequest extends Model
{
    use HasFactory, Auditable;

    protected $fillable = [
        'asset_id',
        'user_id',
        'issue_description',
        'priority',
        'photo_path',
        'technician_id',
        'status',
        'approved_by',
        'resolution_notes',
        'resolution_date',
    ];

    protected $casts = [
        'resolution_date' => 'datetime',
    ];

    public function asset()
    {
        return $this->belongsTo(Asset::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function technician()
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
