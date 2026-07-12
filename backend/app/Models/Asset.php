<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Asset extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'asset_tag',
        'serial_number',
        'category_id',
        'acquisition_date',
        'acquisition_cost',
        'condition',
        'location',
        'status',
        'is_bookable',
        'department_id',
        'holder_id',
        'photo_path',
    ];

    protected $casts = [
        'is_bookable' => 'boolean',
        'acquisition_cost' => 'decimal:2',
        'acquisition_date' => 'date',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function holder()
    {
        return $this->belongsTo(User::class, 'holder_id');
    }

    public function allocations()
    {
        return $this->hasMany(Allocation::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class, 'resource_id');
    }

    public function transfers()
    {
        return $this->hasMany(AssetTransfer::class);
    }

    public function maintenanceRequests()
    {
        return $this->hasMany(MaintenanceRequest::class);
    }

    public function auditLines()
    {
        return $this->hasMany(AuditLine::class);
    }
}
