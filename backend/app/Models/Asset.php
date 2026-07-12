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

    protected static function booted()
    {
        static::creating(function ($asset) {
            if (empty($asset->asset_tag)) {
                $asset->asset_tag = self::generateNextTag();
            }
        });

        static::updating(function ($asset) {
            if ($asset->isDirty('asset_tag')) {
                $asset->asset_tag = $asset->getOriginal('asset_tag');
            }
        });
    }

    public static function generateNextTag()
    {
        $tags = self::where('asset_tag', 'like', 'AF-%')
            ->pluck('asset_tag')
            ->toArray();
            
        $maxNum = 0;
        foreach ($tags as $tag) {
            if (preg_match('/^AF-(\d+)$/', $tag, $matches)) {
                $num = (int) $matches[1];
                if ($num > $maxNum) {
                    $maxNum = $num;
                }
            }
        }
        
        $nextNum = $maxNum + 1;
        return 'AF-' . str_pad($nextNum, 4, '0', STR_PAD_LEFT);
    }

    public function scopeSearch($query, $search)
    {
        if (empty($search)) {
            return $query;
        }
        return $query->where(function ($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
              ->orWhere('asset_tag', 'like', "%{$search}%")
              ->orWhere('serial_number', 'like', "%{$search}%")
              ->orWhere('location', 'like', "%{$search}%");
        });
    }

    public function scopeCategory($query, $categoryId)
    {
        if (empty($categoryId) || $categoryId === 'all') {
            return $query;
        }
        return $query->where('category_id', $categoryId);
    }

    public function scopeStatus($query, $status)
    {
        if (empty($status) || $status === 'all') {
            return $query;
        }
        return $query->where('status', $status);
    }

    public function scopeCondition($query, $condition)
    {
        if (empty($condition) || $condition === 'all') {
            return $query;
        }
        return $query->where('condition', $condition);
    }
}

