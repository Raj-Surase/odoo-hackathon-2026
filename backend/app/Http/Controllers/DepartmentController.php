<?php

namespace App\Http\Controllers;

use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;

class DepartmentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // View policy check (any logged in user can view, but let's authorize viewAny)
        Gate::authorize('viewAny', Department::class);

        $departments = Department::with(['parent', 'head'])->get();

        return response()->json($departments);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        Gate::authorize('create', Department::class);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:departments,name|max:255',
            'head_id' => 'nullable|exists:users,id',
            'parent_id' => 'nullable|exists:departments,id',
            'status' => 'required|in:Active,Inactive',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $department = Department::create($validator->validated());

        return response()->json($department->load(['parent', 'head']), 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Department $department)
    {
        Gate::authorize('update', $department);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:departments,name,' . $department->id,
            'head_id' => 'nullable|exists:users,id',
            'parent_id' => 'nullable|exists:departments,id',
            'status' => 'required|in:Active,Inactive',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // Cyclic check
        if ($request->filled('parent_id')) {
            $parentId = $request->input('parent_id');
            if ($parentId == $department->id) {
                return response()->json([
                    'message' => 'Validation error',
                    'errors' => ['parent_id' => ['A department cannot be its own parent.']]
                ], 422);
            }

            $temp = Department::find($parentId);
            while ($temp) {
                if ($temp->id === $department->id) {
                    return response()->json([
                        'message' => 'Validation error',
                        'errors' => ['parent_id' => ['Cyclic parent-child relationship detected.']]
                    ], 422);
                }
                $temp = $temp->parent;
            }
        }

        $department->update($validator->validated());

        return response()->json($department->load(['parent', 'head']));
    }

    /**
     * Remove the specified resource from storage (Deactivate).
     */
    public function destroy(Department $department)
    {
        Gate::authorize('delete', $department);

        $department->update(['status' => 'Inactive']);

        return response()->json($department->load(['parent', 'head']));
    }
}
