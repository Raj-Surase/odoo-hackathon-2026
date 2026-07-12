<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'action',
        'model',
        'record_id',
        'old_values',
        'new_values',
        'timestamp',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'timestamp' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    protected static function booted()
    {
        static::updating(function ($model) {
            throw new \Exception('Audit logs are immutable and cannot be updated.');
        });

        static::deleting(function ($model) {
            throw new \Exception('Audit logs are immutable and cannot be deleted.');
        });
    }
}
