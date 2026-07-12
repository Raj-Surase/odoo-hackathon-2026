<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DepartmentManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $regularUser;
    protected Department $engDept;

    protected function setUp(): void
    {
        parent::setUp();

        $this->engDept = Department::create([
            'name' => 'Engineering',
            'status' => 'Active',
        ]);

        $this->adminUser = User::create([
            'name' => 'Admin Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('Password123!'),
            'role' => 'Admin',
            'status' => 'Active',
            'department_id' => $this->engDept->id,
        ]);

        $this->regularUser = User::create([
            'name' => 'Regular User',
            'email' => 'user@example.com',
            'password' => bcrypt('Password123!'),
            'role' => 'Employee',
            'status' => 'Active',
            'department_id' => $this->engDept->id,
        ]);
    }

    public function test_authenticated_user_can_list_departments()
    {
        $response = $this->actingAs($this->regularUser)
            ->getJson('/api/v1/departments-all');

        $response->assertStatus(200);
        $response->assertJsonCount(1);
    }

    public function test_unauthenticated_user_cannot_list_departments()
    {
        $response = $this->getJson('/api/v1/departments-all');
        $response->assertStatus(401);
    }

    public function test_admin_can_create_department()
    {
        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/v1/departments', [
                'name' => 'Product Design',
                'parent_id' => $this->engDept->id,
                'status' => 'Active',
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('departments', [
            'name' => 'Product Design',
            'parent_id' => $this->engDept->id,
        ]);
    }

    public function test_non_admin_cannot_create_department()
    {
        $response = $this->actingAs($this->regularUser)
            ->postJson('/api/v1/departments', [
                'name' => 'HR',
                'status' => 'Active',
            ]);

        $response->assertStatus(403);
    }

    public function test_create_department_validates_duplicate_name()
    {
        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/v1/departments', [
                'name' => 'Engineering',
                'status' => 'Active',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name']);
    }

    public function test_admin_can_update_department()
    {
        $response = $this->actingAs($this->adminUser)
            ->putJson("/api/v1/departments/{$this->engDept->id}", [
                'name' => 'Engineering and QA',
                'status' => 'Active',
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('departments', [
            'id' => $this->engDept->id,
            'name' => 'Engineering and QA',
        ]);
    }

    public function test_update_prevents_cyclic_parent_hierarchy()
    {
        // Create child dept
        $qaDept = Department::create([
            'name' => 'QA',
            'parent_id' => $this->engDept->id,
            'status' => 'Active',
        ]);

        // Attempt to set child (QA) as the parent of the parent (Engineering)
        $response = $this->actingAs($this->adminUser)
            ->putJson("/api/v1/departments/{$this->engDept->id}", [
                'name' => 'Engineering',
                'parent_id' => $qaDept->id,
                'status' => 'Active',
            ]);

        $response->assertStatus(422);
        $response->assertJsonStructure(['errors' => ['parent_id']]);
    }

    public function test_admin_can_deactivate_department()
    {
        $response = $this->actingAs($this->adminUser)
            ->deleteJson("/api/v1/departments/{$this->engDept->id}");

        $response->assertStatus(200);
        $this->assertDatabaseHas('departments', [
            'id' => $this->engDept->id,
            'status' => 'Inactive',
        ]);
    }
}
