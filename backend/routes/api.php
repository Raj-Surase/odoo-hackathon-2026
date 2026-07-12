<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\EmployeeController;
use App\Models\Department;

Route::prefix('v1')->group(function () {
    // Auth Routes
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/register', [AuthController::class, 'register']);
    
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/login', [AuthController::class, 'login']);
    
    // Public active departments list for registration dropdown
    Route::get('/departments', function () {
        return response()->json(Department::where('status', 'Active')->get(['id', 'name']));
    });

    // Protected Routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/logout', [AuthController::class, 'logout']);
        
        Route::get('/auth/user', [AuthController::class, 'user']);
        Route::get('/user', [AuthController::class, 'user']);

        // Admin-only Routes (via the 'admin' Gate middleware)
        Route::middleware('can:admin')->group(function () {
            Route::post('/departments', [DepartmentController::class, 'store']);
            Route::put('/departments/{department}', [DepartmentController::class, 'update']);
            Route::delete('/departments/{department}', [DepartmentController::class, 'destroy']);

            Route::post('/categories', [CategoryController::class, 'store']);
            Route::put('/categories/{category}', [CategoryController::class, 'update']);
            Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

            Route::patch('/employees/{user}/role', [EmployeeController::class, 'updateRole']);
        });

        // Common Protected Routes (viewable by any authenticated user)
        Route::get('/departments-all', [DepartmentController::class, 'index']);
        Route::get('/categories', [CategoryController::class, 'index']);
        Route::get('/employees', [EmployeeController::class, 'index']);
    });
});
