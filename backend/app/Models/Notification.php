<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'recipient_id',
        'type',
        'title',
        'message',
        'is_read',
        'reference_type',
        'reference_id',
    ];

    protected $casts = [
        'is_read' => 'boolean',
    ];

    public function recipient()
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    public function reference()
    {
        return $this->morphTo();
    }
}
