<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AuditLogController extends Controller
{
    /**
     * Display a listing of audit logs.
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', AuditLog::class);

        $query = AuditLog::with('user');

        if ($request->has('model')) {
            $query->where('model', 'like', '%' . $request->model . '%');
        }

        if ($request->has('action')) {
            $query->where('action', $request->action);
        }

        // Return latest paginated or limited audit logs
        return response()->json($query->latest()->paginate(50));
    }
}
