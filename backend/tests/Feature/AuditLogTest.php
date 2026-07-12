<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Asset;
use App\Models\User;
use App\Models\Department;
use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $managerUser;
    protected User $employeeUser;
    protected Department $department;

    protected function setUp(): void
    {
        parent::setUp();

        $this->department = Department::create(['name' => 'IT Services']);

        $this->adminUser = User::create([
            'name' => 'Admin Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('Password123!'),
            'role' => 'Admin',
            'status' => 'Active',
            'department_id' => $this->department->id,
        ]);

        $this->managerUser = User::create([
            'name' => 'Asset Manager',
            'email' => 'manager@example.com',
            'password' => bcrypt('Password123!'),
            'role' => 'Asset Manager',
            'status' => 'Active',
            'department_id' => $this->department->id,
        ]);

        $this->employeeUser = User::create([
            'name' => 'IT Employee',
            'email' => 'itemployee@example.com',
            'password' => bcrypt('Password123!'),
            'role' => 'Employee',
            'status' => 'Active',
            'department_id' => $this->department->id,
        ]);
    }

    public function test_crud_activity_generates_audit_logs()
    {
        $this->actingAs($this->adminUser);

        // 1. Create audit log
        $category = Category::create([
            'name' => 'Monitors',
            'custom_fields' => []
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'created',
            'model' => Category::class,
            'record_id' => $category->id,
            'user_id' => $this->adminUser->id,
        ]);

        // Verify values
        $logCreated = AuditLog::where('model', Category::class)->first();
        $this->assertEquals('Monitors', $logCreated->new_values['name']);

        // 2. Update audit log
        $category->update(['name' => 'Super Monitors']);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'updated',
            'model' => Category::class,
            'record_id' => $category->id,
            'user_id' => $this->adminUser->id,
        ]);

        $logUpdated = AuditLog::where('action', 'updated')->where('model', Category::class)->first();
        $this->assertEquals('Monitors', $logUpdated->old_values['name']);
        $this->assertEquals('Super Monitors', $logUpdated->new_values['name']);

        // 3. Delete audit log
        $category->delete();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'deleted',
            'model' => Category::class,
            'record_id' => $category->id,
            'user_id' => $this->adminUser->id,
        ]);

        $logDeleted = AuditLog::where('action', 'deleted')->where('model', Category::class)->first();
        $this->assertEquals('Super Monitors', $logDeleted->old_values['name']);
    }

    public function test_audit_logs_are_immutable()
    {
        $this->actingAs($this->adminUser);

        $category = Category::create([
            'name' => 'Laptops',
        ]);

        $log = AuditLog::where('model', Category::class)->first();
        $this->assertNotNull($log);

        // Attempt Update
        try {
            $log->update(['action' => 'tampered']);
            $this->fail('Expected exception was not thrown.');
        } catch (\Exception $e) {
            $this->assertStringContainsString('Audit logs are immutable', $e->getMessage());
        }

        // Attempt Delete
        try {
            $log->delete();
            $this->fail('Expected exception was not thrown.');
        } catch (\Exception $e) {
            $this->assertStringContainsString('Audit logs are immutable', $e->getMessage());
        }

        // Confirm database still has log
        $this->assertDatabaseHas('audit_logs', ['id' => $log->id]);
    }

    public function test_audit_logs_api_authorization()
    {
        // 1. Employee gets 403
        $this->actingAs($this->employeeUser);
        $response = $this->getJson('/api/v1/audit-logs');
        $response->assertStatus(403);

        // 2. Admin gets 200
        $this->actingAs($this->adminUser);
        $response = $this->getJson('/api/v1/audit-logs');
        $response->assertStatus(200);

        // 3. Asset Manager gets 200
        $this->actingAs($this->managerUser);
        $response = $this->getJson('/api/v1/audit-logs');
        $response->assertStatus(200);
    }
}
