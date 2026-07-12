<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Category;
use App\Models\Department;
use App\Models\MaintenanceRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MaintenanceRequestTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $managerUser;
    protected User $employee1;
    protected User $employee2;
    protected Department $dept1;
    protected Category $category;
    protected Asset $asset;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dept1 = Department::create(['name' => 'IT Services']);

        $this->adminUser = User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => bcrypt('password123'),
            'role' => 'Admin',
            'status' => 'Active',
            'department_id' => $this->dept1->id,
        ]);

        $this->managerUser = User::create([
            'name' => 'Asset Manager',
            'email' => 'manager@example.com',
            'password' => bcrypt('password123'),
            'role' => 'Asset Manager',
            'status' => 'Active',
            'department_id' => $this->dept1->id,
        ]);

        $this->employee1 = User::create([
            'name' => 'Employee One',
            'email' => 'emp1@example.com',
            'password' => bcrypt('password123'),
            'role' => 'Employee',
            'status' => 'Active',
            'department_id' => $this->dept1->id,
        ]);

        $this->employee2 = User::create([
            'name' => 'Employee Two',
            'email' => 'emp2@example.com',
            'password' => bcrypt('password123'),
            'role' => 'Employee',
            'status' => 'Active',
            'department_id' => $this->dept1->id,
        ]);

        $this->category = Category::create([
            'name' => 'Hardware',
            'custom_fields' => [],
        ]);

        $this->asset = Asset::create([
            'name' => 'Developer Workstation',
            'asset_tag' => 'AF-9999',
            'category_id' => $this->category->id,
            'status' => 'Available',
            'condition' => 'Good',
        ]);
    }

    public function test_authenticated_user_can_submit_maintenance_request()
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->image('issue.jpg');

        $response = $this->actingAs($this->employee1)
            ->postJson('/api/v1/maintenance/requests', [
                'asset_id' => $this->asset->id,
                'priority' => 'High',
                'issue_description' => 'Blue screen on booting.',
                'photo' => $file,
            ]);

        $response->assertStatus(201);
        $response->assertJsonPath('status', 'Pending');
        $response->assertJsonPath('priority', 'High');

        $this->assertDatabaseHas('maintenance_requests', [
            'asset_id' => $this->asset->id,
            'user_id' => $this->employee1->id,
            'priority' => 'High',
            'status' => 'Pending',
        ]);

        $request = MaintenanceRequest::first();
        $this->assertNotNull($request->photo_path);
        Storage::disk('public')->assertExists($request->photo_path);
    }

    public function test_observer_syncs_asset_status_on_approval()
    {
        $maintenanceRequest = MaintenanceRequest::create([
            'asset_id' => $this->asset->id,
            'user_id' => $this->employee1->id,
            'issue_description' => 'Bulb broken',
            'priority' => 'Medium',
            'status' => 'Pending',
        ]);

        $this->assertEquals('Available', $this->asset->fresh()->status);

        // Approve request
        $response = $this->actingAs($this->managerUser)
            ->patchJson("/api/v1/maintenance/requests/{$maintenanceRequest->id}", [
                'status' => 'Approved',
            ]);

        $response->assertStatus(200);
        $this->assertEquals('Under Maintenance', $this->asset->fresh()->status);
    }

    public function test_observer_syncs_asset_status_on_resolved()
    {
        $maintenanceRequest = MaintenanceRequest::create([
            'asset_id' => $this->asset->id,
            'user_id' => $this->employee1->id,
            'issue_description' => 'Bulb broken',
            'priority' => 'Medium',
            'status' => 'Approved',
        ]);
        
        $this->asset->update(['status' => 'Under Maintenance']);

        $response = $this->actingAs($this->managerUser)
            ->patchJson("/api/v1/maintenance/requests/{$maintenanceRequest->id}", [
                'status' => 'Resolved',
                'resolution_notes' => 'Bulb replaced.',
            ]);

        $response->assertStatus(200);
        $this->assertEquals('Available', $this->asset->fresh()->status);
        $this->assertNotNull($maintenanceRequest->fresh()->resolution_date);
    }

    public function test_kanban_groups_correctly_and_scopes_by_role()
    {
        // 1. Create a request for employee 1
        $req1 = MaintenanceRequest::create([
            'asset_id' => $this->asset->id,
            'user_id' => $this->employee1->id,
            'issue_description' => 'Req 1 description',
            'priority' => 'Medium',
            'status' => 'Pending',
        ]);

        // 2. Create a request for employee 2
        $req2 = MaintenanceRequest::create([
            'asset_id' => $this->asset->id,
            'user_id' => $this->employee2->id,
            'issue_description' => 'Req 2 description',
            'priority' => 'High',
            'status' => 'Pending',
        ]);

        // Employee 1 gets Kanban: should only see req 1
        $response = $this->actingAs($this->employee1)
            ->getJson('/api/v1/maintenance/kanban');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'Pending');
        $response->assertJsonPath('Pending.0.id', $req1->id);

        // Manager gets Kanban: should see both
        $response = $this->actingAs($this->managerUser)
            ->getJson('/api/v1/maintenance/kanban');

        $response->assertStatus(200);
        $response->assertJsonCount(2, 'Pending');
    }

    public function test_only_managers_can_approve_requests()
    {
        $maintenanceRequest = MaintenanceRequest::create([
            'asset_id' => $this->asset->id,
            'user_id' => $this->employee1->id,
            'issue_description' => 'Broken screen',
            'priority' => 'Medium',
            'status' => 'Pending',
        ]);

        // Employee tries to approve
        $response = $this->actingAs($this->employee1)
            ->patchJson("/api/v1/maintenance/requests/{$maintenanceRequest->id}", [
                'status' => 'Approved',
            ]);

        $response->assertStatus(403);
        $this->assertEquals('Pending', $maintenanceRequest->fresh()->status);
    }
}
