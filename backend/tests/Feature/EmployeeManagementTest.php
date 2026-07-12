<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Department;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $regularUser;
    protected Department $dept;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dept = Department::create(['name' => 'HR']);

        $this->adminUser = User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => bcrypt('Password123!'),
            'role' => 'Admin',
            'status' => 'Active',
            'department_id' => $this->dept->id,
        ]);

        $this->regularUser = User::create([
            'name' => 'Regular User',
            'email' => 'user@example.com',
            'password' => bcrypt('Password123!'),
            'role' => 'Employee',
            'status' => 'Active',
            'department_id' => $this->dept->id,
        ]);
    }

    public function test_authenticated_user_can_list_employees()
    {
        $response = $this->actingAs($this->regularUser)
            ->getJson('/api/v1/employees');

        $response->assertStatus(200);
        $response->assertJsonCount(2); // admin and regular
    }

    public function test_admin_can_update_employee_role_and_status()
    {
        $response = $this->actingAs($this->adminUser)
            ->patchJson("/api/v1/employees/{$this->regularUser->id}/role", [
                'role' => 'Asset Manager',
                'status' => 'Inactive',
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('users', [
            'id' => $this->regularUser->id,
            'role' => 'Asset Manager',
            'status' => 'Inactive',
        ]);
    }

    public function test_non_admin_cannot_update_employee_role()
    {
        $response = $this->actingAs($this->regularUser)
            ->patchJson("/api/v1/employees/{$this->adminUser->id}/role", [
                'role' => 'Employee',
            ]);

        $response->assertStatus(403);
    }

    public function test_user_cannot_update_their_own_role()
    {
        $response = $this->actingAs($this->adminUser)
            ->patchJson("/api/v1/employees/{$this->adminUser->id}/role", [
                'role' => 'Employee', // Try to demote/change role
            ]);

        $response->assertStatus(403);
        $response->assertJsonFragment([
            'message' => 'You cannot change your own role.'
        ]);
    }
}
