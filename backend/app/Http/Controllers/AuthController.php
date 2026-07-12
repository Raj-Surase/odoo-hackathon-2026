<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Handle user registration.
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:2|max:100',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => [
                'required',
                'string',
                'min:8',
                'regex:/[A-Z]/', // at least one uppercase letter
                'regex:/[0-9]/', // at least one number
                'regex:/[!@#$%^&*(),.?":{}|<>]/', // at least one special character
            ],
            'department_id' => 'required|exists:departments,id',
        ], [
            'email.unique' => 'An account with this email already exists',
            'password.min' => 'Password must be at least 8 characters and contain at least one uppercase letter, one number, and one special character.',
            'password.regex' => 'Password must contain at least one uppercase letter, one number, and one special character.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // Create the user, hardcoding Employee role and Active status
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'Employee', // Hardcoded default
            'department_id' => $request->department_id,
            'status' => 'Active', // Hardcoded default
        ]);

        // Generate Sanctum token
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user->makeHidden(['password', 'remember_token']),
            'token' => $token,
        ], 201);
    }

    /**
     * Handle user login.
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid email or password',
            ], 401);
        }

        // Check if user is active
        if ($user->status !== 'Active') {
            return response()->json([
                'message' => 'Your account is inactive. Please contact administration.',
            ], 403);
        }

        // Generate Sanctum token
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user->makeHidden(['password', 'remember_token']),
            'token' => $token,
        ], 200);
    }

    /**
     * Handle user logout.
     */
    public function logout(Request $request)
    {
        if ($request->user()) {
            $request->user()->currentAccessToken()->delete();
        }

        return response()->json([
            'message' => 'Successfully logged out',
        ], 200);
    }

    /**
     * Get the authenticated user.
     */
    public function user(Request $request)
    {
        return response()->json($request->user()->makeHidden(['password', 'remember_token']));
    }
}
