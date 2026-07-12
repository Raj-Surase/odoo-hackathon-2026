<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;

class EmployeeController extends Controller
{
    /**
     * Display a listing of employees.
     */
    public function index()
    {
        Gate::authorize('viewAny', User::class);

        $employees = User::with('department')->get();

        return response()->json($employees);
    }

    /**
     * Update the employee's role/status.
     */
    public function updateRole(Request $request, User $user)
    {
        // Enforce the UserPolicy checks
        $authorizationResponse = Gate::inspect('update', $user);
        if ($authorizationResponse->denied()) {
            return response()->json([
                'message' => $authorizationResponse->message()
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'role' => 'sometimes|required|string|in:Employee,Dept Head,Asset Manager,Admin',
            'status' => 'sometimes|required|string|in:Active,Inactive',
            'department_id' => 'sometimes|nullable|exists:departments,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $user->update($validator->validated());

        return response()->json($user->load('department'));
    }
}
