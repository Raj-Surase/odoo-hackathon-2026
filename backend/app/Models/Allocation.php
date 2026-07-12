<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Allocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'asset_id',
        'user_id',
        'department_id',
        'allocated_date',
        'expected_return',
        'actual_return',
        'condition_notes',
        'status',
    ];

    protected $casts = [
        'allocated_date' => 'datetime',
        'expected_return' => 'date',
        'actual_return' => 'datetime',
    ];

    public function asset()
    {
        return $this->belongsTo(Asset::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }
}
