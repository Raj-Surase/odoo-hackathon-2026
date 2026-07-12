<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
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
    });
});
