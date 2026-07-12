<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;

class Department extends Model
{
    use HasFactory, Auditable;

    protected $fillable = [
        'name',
        'head_id',
        'parent_id',
        'status',
    ];

    public function head()
    {
        return $this->belongsTo(User::class, 'head_id');
    }

    public function parent()
    {
        return $this->belongsTo(Department::class, 'parent_id');
    }

    public function subDepartments()
    {
        return $this->hasMany(Department::class, 'parent_id');
    }

    public function employees()
    {
        return $this->hasMany(User::class, 'department_id');
    }
}
