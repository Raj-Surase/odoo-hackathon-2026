<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Traits\Auditable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, Auditable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'department_id',
        'status',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function allocations()
    {
        return $this->hasMany(Allocation::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    public function transfersSent()
    {
        return $this->hasMany(AssetTransfer::class, 'from_user_id');
    }

    public function transfersReceived()
    {
        return $this->hasMany(AssetTransfer::class, 'to_user_id');
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class, 'recipient_id');
    }

    public function isEmployee(): bool
    {
        return $this->role === 'Employee';
    }

    public function isDeptHead(): bool
    {
        return $this->role === 'Dept Head';
    }

    public function isAssetManager(): bool
    {
        return $this->role === 'Asset Manager';
    }

    public function isAdmin(): bool
    {
        return $this->role === 'Admin';
    }
}
