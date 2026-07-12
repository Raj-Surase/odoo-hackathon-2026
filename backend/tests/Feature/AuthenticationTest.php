<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Department;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected Department $department;

    protected function setUp(): void
    {
        parent::setUp();

        // Create a department for testing
        $this->department = Department::create([
            'name' => 'Engineering',
            'status' => 'Active',
        ]);
    }

    /**
     * Test successful registration with default Employee role.
     */
    public function test_user_can_register_as_employee_by_default()
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'Password123!',
            'department_id' => $this->department->id,
            'role' => 'Admin', // Attempt to elevate role during signup
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'user' => ['id', 'name', 'email', 'role', 'department_id', 'status'],
            'token',
        ]);

        // Verify role is hardcoded to Employee despite API parameter
        $this->assertEquals('Employee', $response->json('user.role'));
        $this->assertEquals('Active', $response->json('user.status'));
        $this->assertDatabaseHas('users', [
            'email' => 'john@example.com',
            'role' => 'Employee',
        ]);
    }

    /**
     * Test weak password validation.
     */
    public function test_registration_validates_weak_password()
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'weak',
            'department_id' => $this->department->id,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['password']);
    }

    /**
     * Test login returns token and sanitized user.
     */
    public function test_user_can_login_with_valid_credentials()
    {
        $user = User::create([
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'password' => Hash::make('Password123!'),
            'department_id' => $this->department->id,
            'role' => 'Employee',
            'status' => 'Active',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'jane@example.com',
            'password' => 'Password123!',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'user' => ['id', 'name', 'email', 'role', 'department_id', 'status'],
            'token',
        ]);
    }

    /**
     * Test login fails with invalid credentials.
     */
    public function test_login_fails_with_invalid_credentials()
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'nonexistent@example.com',
            'password' => 'WrongPass123!',
        ]);

        $response->assertStatus(401);
        $response->assertJson([
            'message' => 'Invalid email or password',
        ]);
    }

    public function test_user_cannot_perform_self_role_elevation()
    {
        $user = User::create([
            'name' => 'Employee User',
            'email' => 'employee@example.com',
            'password' => Hash::make('Password123!'),
            'department_id' => $this->department->id,
            'role' => 'Employee',
            'status' => 'Active',
        ]);

        // Merge input payload into request helper to simulate API parameters
        request()->merge(['role' => 'Admin']);

        $policy = new \App\Policies\UserPolicy();
        $response = $policy->update($user, $user);

        $this->assertFalse($response->allowed());
        $this->assertEquals(403, $response->code());
        $this->assertEquals('You cannot change your own role.', $response->message());
    }
}
