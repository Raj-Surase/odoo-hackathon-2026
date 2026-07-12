<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Asset;
use App\Models\User;
use App\Models\Department;
use App\Models\Allocation;
use App\Models\AssetTransfer;
use App\Models\MaintenanceRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssetManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $managerUser;
    protected User $deptHeadUser;
    protected User $employeeUser;
    protected Department $itDept;
    protected Category $electronics;

    protected function setUp(): void
    {
        parent::setUp();

        $this->itDept = Department::create(['name' => 'IT Services']);

        $this->adminUser = User::create([
            'name' => 'Admin Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('Password123!'),
            'role' => 'Admin',
            'status' => 'Active',
            'department_id' => $this->itDept->id,
        ]);

        $this->managerUser = User::create([
            'name' => 'Asset Manager',
            'email' => 'manager@example.com',
            'password' => bcrypt('Password123!'),
            'role' => 'Asset Manager',
            'status' => 'Active',
            'department_id' => $this->itDept->id,
        ]);

        $this->deptHeadUser = User::create([
            'name' => 'Dept Head',
            'email' => 'head@example.com',
            'password' => bcrypt('Password123!'),
            'role' => 'Dept Head',
            'status' => 'Active',
            'department_id' => $this->itDept->id,
        ]);

        $this->employeeUser = User::create([
            'name' => 'Regular Employee',
            'email' => 'employee@example.com',
            'password' => bcrypt('Password123!'),
            'role' => 'Employee',
            'status' => 'Active',
            'department_id' => $this->itDept->id,
        ]);

        $this->electronics = Category::create([
            'name' => 'Electronics',
            'custom_fields' => [
                ['name' => 'RAM', 'type' => 'text', 'required' => true],
            ],
        ]);
    }

    public function test_asset_tag_is_auto_generated()
    {
        // Create an asset without explicit tag
        $asset = Asset::create([
            'name' => 'MacBook Pro',
            'serial_number' => 'SN-MAC-1111',
            'category_id' => $this->electronics->id,
            'condition' => 'Good',
            'is_bookable' => false,
        ]);

        $this->assertNotNull($asset->asset_tag);
        $this->assertEquals('AF-0001', $asset->asset_tag);

        // Create a second one to test auto-increment
        $asset2 = Asset::create([
            'name' => 'ThinkPad',
            'serial_number' => 'SN-THINK-2222',
            'category_id' => $this->electronics->id,
            'condition' => 'Fair',
            'is_bookable' => false,
        ]);

        $this->assertEquals('AF-0002', $asset2->asset_tag);
    }

    public function test_asset_tag_is_read_only()
    {
        $asset = Asset::create([
            'name' => 'MacBook Pro',
            'asset_tag' => 'AF-0001',
            'serial_number' => 'SN-MAC-1111',
            'category_id' => $this->electronics->id,
            'condition' => 'Good',
            'is_bookable' => false,
        ]);

        $this->assertEquals('AF-0001', $asset->asset_tag);

        // Attempt to update tag
        $asset->update(['asset_tag' => 'AF-9999']);
        $asset->refresh();

        // Should still be AF-0001
        $this->assertEquals('AF-0001', $asset->asset_tag);
    }

    public function test_admin_or_asset_manager_can_create_asset()
    {
        $response = $this->actingAs($this->managerUser)
            ->postJson('/api/v1/assets', [
                'name' => 'iPhone 15',
                'serial_number' => 'SN-IPHONE-15',
                'category_id' => $this->electronics->id,
                'condition' => 'Good',
                'location' => 'HQ Desk 3',
                'is_bookable' => true,
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('assets', [
            'name' => 'iPhone 15',
            'serial_number' => 'SN-IPHONE-15',
            'asset_tag' => 'AF-0001',
        ]);
    }

    public function test_employee_cannot_create_asset()
    {
        $response = $this->actingAs($this->employeeUser)
            ->postJson('/api/v1/assets', [
                'name' => 'iPhone 15',
                'serial_number' => 'SN-IPHONE-15',
                'category_id' => $this->electronics->id,
                'condition' => 'Good',
                'is_bookable' => true,
            ]);

        $response->assertStatus(403);
    }

    public function test_asset_listing_is_scoped_by_role()
    {
        // Create 3 assets
        // 1: Allocated to employeeUser, dept: itDept
        $asset1 = Asset::create([
            'name' => 'Employee Laptop',
            'asset_tag' => 'AF-0001',
            'category_id' => $this->electronics->id,
            'condition' => 'Good',
            'is_bookable' => false,
            'department_id' => $this->itDept->id,
            'holder_id' => $this->employeeUser->id,
        ]);

        // 2: Allocated to deptHeadUser, dept: itDept
        $asset2 = Asset::create([
            'name' => 'Head Screen',
            'asset_tag' => 'AF-0002',
            'category_id' => $this->electronics->id,
            'condition' => 'Good',
            'is_bookable' => false,
            'department_id' => $this->itDept->id,
            'holder_id' => $this->deptHeadUser->id,
        ]);

        // 3: Unallocated, department: HR (another department)
        $hrDept = Department::create(['name' => 'HR']);
        $asset3 = Asset::create([
            'name' => 'HR Printer',
            'asset_tag' => 'AF-0003',
            'category_id' => $this->electronics->id,
            'condition' => 'Fair',
            'is_bookable' => false,
            'department_id' => $hrDept->id,
            'holder_id' => null,
        ]);

        // Scenario A: Admin listing (should see all 3)
        $responseAdmin = $this->actingAs($this->adminUser)->getJson('/api/v1/assets');
        $responseAdmin->assertStatus(200);
        $responseAdmin->assertJsonCount(3);

        // Scenario B: Employee listing (should only see asset1 where holder_id matches employeeUser->id)
        $responseEmployee = $this->actingAs($this->employeeUser)->getJson('/api/v1/assets');
        $responseEmployee->assertStatus(200);
        $responseEmployee->assertJsonCount(1);
        $responseEmployee->assertJsonFragment(['name' => 'Employee Laptop']);

        // Scenario C: Dept Head listing (should see asset1 and asset2 since they belong to itDept, but not asset3)
        $responseHead = $this->actingAs($this->deptHeadUser)->getJson('/api/v1/assets');
        $responseHead->assertStatus(200);
        $responseHead->assertJsonCount(2);
    }

    public function test_asset_search_and_filters()
    {
        Asset::create([
            'name' => 'Lenovo ThinkPad',
            'asset_tag' => 'AF-0001',
            'serial_number' => 'SN-LENOVO-111',
            'category_id' => $this->electronics->id,
            'condition' => 'Good',
            'status' => 'Available',
            'location' => 'Bengaluru',
            'is_bookable' => false,
        ]);

        Asset::create([
            'name' => 'Logitech Mouse',
            'asset_tag' => 'AF-0002',
            'serial_number' => 'SN-LOGI-222',
            'category_id' => $this->electronics->id,
            'condition' => 'Fair',
            'status' => 'Under Maintenance',
            'location' => 'Mumbai',
            'is_bookable' => false,
        ]);

        // Search tag or name
        $responseSearch = $this->actingAs($this->adminUser)
            ->getJson('/api/v1/assets?search=Lenovo');
        $responseSearch->assertJsonCount(1);
        $responseSearch->assertJsonFragment(['name' => 'Lenovo ThinkPad']);

        // Filter status
        $responseStatus = $this->actingAs($this->adminUser)
            ->getJson('/api/v1/assets?status=Under Maintenance');
        $responseStatus->assertJsonCount(1);
        $responseStatus->assertJsonFragment(['name' => 'Logitech Mouse']);

        // Filter condition
        $responseCondition = $this->actingAs($this->adminUser)
            ->getJson('/api/v1/assets?condition=Good');
        $responseCondition->assertJsonCount(1);
        $responseCondition->assertJsonFragment(['name' => 'Lenovo ThinkPad']);
    }

    public function test_asset_history_log()
    {
        $asset = Asset::create([
            'name' => 'Asset History Test',
            'asset_tag' => 'AF-0001',
            'category_id' => $this->electronics->id,
            'condition' => 'Good',
            'is_bookable' => false,
        ]);

        // Create an allocation record
        Allocation::create([
            'asset_id' => $asset->id,
            'user_id' => $this->employeeUser->id,
            'department_id' => $this->itDept->id,
            'allocated_date' => now()->subDays(5),
            'status' => 'Active',
        ]);

        // Create a maintenance record
        MaintenanceRequest::create([
            'asset_id' => $asset->id,
            'user_id' => $this->employeeUser->id,
            'issue_description' => 'Sticky keys',
            'priority' => 'Low',
            'status' => 'Pending',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->getJson("/api/v1/assets/{$asset->id}/history");

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'asset',
            'timeline' => [
                '*' => [
                    'type',
                    'date',
                    'status',
                    'description',
                    'details',
                    'user',
                ]
            ]
        ]);
        $response->assertJsonCount(2, 'timeline');
    }
}
