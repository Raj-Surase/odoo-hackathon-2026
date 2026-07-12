<?php
namespace App\Http\Controllers;

use App\Models\AssetTransfer;
use App\Models\Asset;
use App\Models\User;
use App\Models\Allocation;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TransferController extends Controller
{
    /**
     * Display a listing of transfer requests.
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', AssetTransfer::class);

        $user = $request->user();
        $query = AssetTransfer::with(['asset', 'fromUser', 'toUser', 'approvedBy']);

        // Scope by user roles
        if ($user->isEmployee()) {
            $query->where(function ($q) use ($user) {
                $q->where('from_user_id', $user->id)
                  ->orWhere('to_user_id', $user->id);
            });
        } elseif ($user->isDeptHead()) {
            $query->where(function ($q) use ($user) {
                $q->where('from_user_id', $user->id)
                  ->orWhere('to_user_id', $user->id)
                  ->orWhereHas('toUser', function ($uq) use ($user) {
                      $uq->where('department_id', $user->department_id);
                  })
                  ->orWhereHas('asset', function ($aq) use ($user) {
                      $aq->where('department_id', $user->department_id);
                  });
            });
        }

        return response()->json($query->latest()->get());
    }

    /**
     * Store a newly created transfer request.
     */
    public function store(Request $request)
    {
        Gate::authorize('create', AssetTransfer::class);

        $validated = $request->validate([
            'asset_id' => 'required|exists:assets,id',
            'to_user_id' => 'required|exists:users,id',
            'reason' => 'required|string',
        ]);

        $asset = Asset::findOrFail($validated['asset_id']);
        $recipient = User::findOrFail($validated['to_user_id']);

        if ($asset->status !== 'Allocated' || !$asset->holder_id) {
            return response()->json([
                'message' => 'This asset is not currently allocated and cannot be transferred.'
            ], 422);
        }

        $fromUserId = $asset->holder_id;

        if ($fromUserId === $recipient->id) {
            return response()->json([
                'message' => 'Recipient cannot be the current asset holder.'
            ], 422);
        }

        // Create the Transfer Request
        $transfer = AssetTransfer::create([
            'asset_id' => $asset->id,
            'from_user_id' => $fromUserId,
            'to_user_id' => $recipient->id,
            'reason' => $validated['reason'],
            'status' => 'Requested',
        ]);

        // Notify Recipient
        Notification::create([
            'recipient_id' => $recipient->id,
            'type' => 'Alert',
            'title' => 'Asset Transfer Requested',
            'message' => "A transfer request for asset {$asset->name} has been initiated for you.",
            'reference_type' => AssetTransfer::class,
            'reference_id' => $transfer->id,
            'is_read' => false,
        ]);

        // Notify Recipient's Dept Head
        if ($recipient->department_id) {
            $deptHeads = User::where('role', 'Dept Head')
                ->where('department_id', $recipient->department_id)
                ->get();
            foreach ($deptHeads as $head) {
                Notification::create([
                    'recipient_id' => $head->id,
                    'type' => 'Approval',
                    'title' => 'Transfer Approval Required',
                    'message' => "Transfer request of {$asset->name} to {$recipient->name} requires approval.",
                    'reference_type' => AssetTransfer::class,
                    'reference_id' => $transfer->id,
                    'is_read' => false,
                ]);
            }
        }

        // Notify Asset Managers / Admins
        $managers = User::whereIn('role', ['Asset Manager', 'Admin'])->get();
        foreach ($managers as $manager) {
            Notification::create([
                'recipient_id' => $manager->id,
                'type' => 'Approval',
                'title' => 'Transfer Request Filed',
                'message' => "Transfer request of {$asset->name} from " . ($transfer->fromUser->name ?? 'Unknown') . " to {$recipient->name} requires approval.",
                'reference_type' => AssetTransfer::class,
                'reference_id' => $transfer->id,
                'is_read' => false,
            ]);
        }

        return response()->json($transfer->load(['asset', 'fromUser', 'toUser']), 201);
    }

    /**
     * Approve the transfer request.
     */
    public function approve(Request $request, AssetTransfer $transfer)
    {
        Gate::authorize('update', $transfer);

        if ($transfer->status !== 'Requested') {
            return response()->json([
                'message' => "Transfer request is already {$transfer->status}."
            ], 422);
        }

        // Update Transfer record
        $transfer->update([
            'status' => 'Approved',
            'approved_by' => $request->user()->id,
        ]);

        $asset = $transfer->asset;
        $recipient = $transfer->toUser;

        // 1. Terminate previous active allocation record
        $previousAllocation = Allocation::where('asset_id', $transfer->asset_id)
            ->whereNull('actual_return')
            ->first();

        $expectedReturn = null;
        if ($previousAllocation) {
            $expectedReturn = $previousAllocation->expected_return;
            $previousAllocation->update([
                'actual_return' => now(),
                'status' => 'Returned', // or Transferred
            ]);
        }

        // 2. Launch new allocation record
        Allocation::create([
            'asset_id' => $transfer->asset_id,
            'user_id' => $transfer->to_user_id,
            'department_id' => $recipient->department_id,
            'allocated_date' => now(),
            'expected_return' => $expectedReturn,
            'status' => 'Active',
        ]);

        // 3. Update Asset
        if ($asset) {
            $asset->update([
                'holder_id' => $transfer->to_user_id,
                'department_id' => $recipient->department_id,
                'status' => 'Allocated',
            ]);
        }

        // Dispatch TransferApproved event
        event(new \App\Events\TransferApproved($transfer));

        return response()->json($transfer->load(['asset', 'fromUser', 'toUser', 'approvedBy']));
    }

    /**
     * Reject the transfer request.
     */
    public function reject(Request $request, AssetTransfer $transfer)
    {
        Gate::authorize('update', $transfer);

        if ($transfer->status !== 'Requested') {
            return response()->json([
                'message' => "Transfer request is already {$transfer->status}."
            ], 422);
        }

        $transfer->update([
            'status' => 'Rejected',
            'approved_by' => $request->user()->id,
        ]);

        $asset = $transfer->asset;

        // Notify original holder
        Notification::create([
            'recipient_id' => $transfer->from_user_id,
            'type' => 'Alert',
            'title' => 'Transfer Request Rejected',
            'message' => "The transfer request for asset {$asset->name} was rejected.",
            'reference_type' => AssetTransfer::class,
            'reference_id' => $transfer->id,
            'is_read' => false,
        ]);

        // Notify recipient
        Notification::create([
            'recipient_id' => $transfer->to_user_id,
            'type' => 'Alert',
            'title' => 'Transfer Request Rejected',
            'message' => "The transfer request for asset {$asset->name} was rejected.",
            'reference_type' => AssetTransfer::class,
            'reference_id' => $transfer->id,
            'is_read' => false,
        ]);

        return response()->json($transfer->load(['asset', 'fromUser', 'toUser', 'approvedBy']));
    }
}
