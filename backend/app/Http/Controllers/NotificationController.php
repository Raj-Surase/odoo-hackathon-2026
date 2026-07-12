<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class NotificationController extends Controller
{
    /**
     * Display a listing of notifications for the authenticated user.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        $query = Notification::where('recipient_id', $user->id);
        
        if ($request->has('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }
        
        // Return latest notifications
        return response()->json($query->latest()->get());
    }

    /**
     * Mark a single notification as read.
     */
    public function markRead(Request $request, Notification $notification)
    {
        Gate::authorize('update', $notification);

        $notification->update(['is_read' => true]);

        return response()->json($notification);
    }

    /**
     * Mark all notifications for the authenticated user as read.
     */
    public function markAllRead(Request $request)
    {
        $user = $request->user();
        
        Notification::where('recipient_id', $user->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }
}
