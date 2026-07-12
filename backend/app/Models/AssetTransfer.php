<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;

class AssetTransfer extends Model
{
    use HasFactory, Auditable;

    protected $fillable = [
        'asset_id',
        'from_user_id',
        'to_user_id',
        'reason',
        'status',
        'approved_by',
    ];

    public function asset()
    {
        return $this->belongsTo(Asset::class);
    }

    public function fromUser()
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }

    public function toUser()
    {
        return $this->belongsTo(User::class, 'to_user_id');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
