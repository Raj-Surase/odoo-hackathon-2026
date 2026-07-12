<?php

namespace App\Traits;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

trait Auditable
{
    /**
     * Boot the trait.
     */
    public static function bootAuditable(): void
    {
        static::created(function ($model) {
            static::logAudit($model, 'created');
        });

        static::updated(function ($model) {
            static::logAudit($model, 'updated');
        });

        static::deleted(function ($model) {
            static::logAudit($model, 'deleted');
        });
    }

    /**
     * Log audit trail.
     */
    protected static function logAudit($model, string $action): void
    {
        if ($model instanceof AuditLog) {
            return;
        }

        $userId = Auth::id();
        $oldValues = null;
        $newValues = null;

        $exclude = ['password', 'remember_token'];

        if ($action === 'created') {
            $newValues = array_diff_key($model->getAttributes(), array_flip($exclude));
        } elseif ($action === 'updated') {
            $dirty = array_diff_key($model->getDirty(), array_flip($exclude));
            if (empty($dirty)) {
                return;
            }
            $newValues = $dirty;
            $oldValues = array_intersect_key($model->getRawOriginal(), $dirty);
        } elseif ($action === 'deleted') {
            $oldValues = array_diff_key($model->getRawOriginal(), array_flip($exclude));
        }

        AuditLog::create([
            'user_id' => $userId,
            'action' => $action,
            'model' => get_class($model),
            'record_id' => $model->getKey(),
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'timestamp' => now(),
        ]);
    }
}
