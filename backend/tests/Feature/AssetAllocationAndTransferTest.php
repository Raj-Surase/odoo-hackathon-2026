<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Asset;
use App\Models\User;
use App\Models\Department;
use App\Models\Allocation;
use App\Models\AssetTransfer;
use App\Models\Notification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Carbon\Carbon;

class AssetAllocationAndTransferTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $managerUser;
    protected User $deptHeadIT;
    protected User $deptHeadHR;
    protected User $employeeIT;
    protected User $employeeHR;
    protected Department $itDept;
    protected Department $hrDept;
    protected Category $electronics;
    protected Asset $macbook;

    protected function setUp(): void
    {
        parent::setUp();

        $this->itDept = Department::create(['name' => 'IT Services']);
        $this->hrDept = Department::create(['name' => 'Human Resources']);

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

        $this->deptHeadIT = User::create([
            'name' => 'IT Head',
            'email' => 'ithead@example.com',
            'password' => bcrypt('Password123!'),
            'role' => 'Dept Head',
            'status' => 'Active',
            'department_id' => $this->itDept->id,
        ]);

        $this->deptHeadHR = User::create([
            'name' => 'HR Head',
            'email' => 'hrhead@example.com',
            'password' => bcrypt('Password123!'),
            'role' => 'Dept Head',
            'status' => 'Active',
            'department_id' => $this->hrDept->id,
        ]);

        $this->employeeIT = User::create([
            'name' => 'IT Employee',
            'email' => 'itemployee@example.com',
            'password' => bcrypt('Password123!'),
            'role' => 'Employee',
            'status' => 'Active',
            'department_id' => $this->itDept->id,
        ]);

        $this->employeeHR = User::create([
            'name' => 'HR Employee',
            'email' => 'hremployee@example.com',
            'password' => bcrypt('Password123!'),
            'role' => 'Employee',
            'status' => 'Active',
            'department_id' => $this->hrDept->id,
        ]);

        $this->electronics = Category::create([
            'name' => 'Electronics',
            'custom_fields' => [
                ['name' => 'RAM', 'type' => 'text', 'required' => true],
            ],
        ]);

        $this->macbook = Asset::create([
            'name' => 'MacBook Pro',
            'serial_number' => 'SN-MAC-7777',
            'category_id' => $this->electronics->id,
            'condition' => 'Good',
            'status' => 'Available',
            'is_bookable' => false,
        ]);
    }

    /**
     * Test successful asset allocation and conflict gate.
     */
    public function test_allocation_and_conflict_validation()
    {
        // 1. Success Allocation
        $response = $this->actingAs($this->managerUser)
            ->postJson('/api/v1/allocations', [
                'asset_id' => $this->macbook->id,
                'user_id' => $this->employeeIT->id,
                'expected_return' => Carbon::tomorrow()->toDateString(),
            ]);

        $response->assertStatus(201);
        $this->macbook->refresh();
        $this->assertEquals('Allocated', $this->macbook->status);
        $this->assertEquals($this->employeeIT->id, $this->macbook->holder_id);

        $this->assertDatabaseHas('allocations', [
            'asset_id' => $this->macbook->id,
            'user_id' => $this->employeeIT->id,
            'status' => 'Active',
        ]);

        // Verify Assignment Notification was sent
        $this->assertDatabaseHas('notifications', [
            'recipient_id' => $this->employeeIT->id,
            'type' => 'asset_assigned',
            'title' => 'Asset Assigned',
        ]);

        // 2. Conflict Gate - allocate already allocated asset
        $conflictResponse = $this->actingAs($this->managerUser)
            ->postJson('/api/v1/allocations', [
                'asset_id' => $this->macbook->id,
                'user_id' => $this->employeeHR->id,
            ]);

        $conflictResponse->assertStatus(422);
        $conflictResponse->assertJsonStructure([
            'message',
            'current_holder' => [
                'id',
                'name',
                'department',
            ]
        ]);
        $conflictResponse->assertJsonFragment([
            'name' => 'IT Employee',
            'department' => 'IT Services',
        ]);
    }

    /**
     * Test asset return check-in endpoint.
     */
    public function test_return_check_in_api()
    {
        // Setup allocation first
        $allocation = Allocation::create([
            'asset_id' => $this->macbook->id,
            'user_id' => $this->employeeIT->id,
            'department_id' => $this->itDept->id,
            'allocated_date' => now(),
            'status' => 'Active',
        ]);
        $this->macbook->update([
            'status' => 'Allocated',
            'holder_id' => $this->employeeIT->id,
        ]);

        // Perform return check-in
        $response = $this->actingAs($this->managerUser)
            ->postJson("/api/v1/allocations/{$allocation->id}/return", [
                'condition' => 'Fair',
                'condition_notes' => 'Returned with minor scratches.',
            ]);

        $response->assertStatus(200);

        $allocation->refresh();
        $this->macbook->refresh();

        $this->assertEquals('Returned', $allocation->status);
        $this->assertNotNull($allocation->actual_return);
        $this->assertEquals('Returned with minor scratches.', $allocation->condition_notes);

        $this->assertEquals('Available', $this->macbook->status);
        $this->assertNull($this->macbook->holder_id);
        $this->assertEquals('Fair', $this->macbook->condition);

        // Verify Notification was sent
        $this->assertDatabaseHas('notifications', [
            'recipient_id' => $this->employeeIT->id,
            'type' => 'Alert',
            'title' => 'Asset Returned',
        ]);
    }

    /**
     * Test transfer request and approval flow.
     */
    public function test_transfer_request_state_pipeline()
    {
        // 1. Setup initial active allocation
        $allocation = Allocation::create([
            'asset_id' => $this->macbook->id,
            'user_id' => $this->employeeIT->id,
            'department_id' => $this->itDept->id,
            'allocated_date' => now(),
            'expected_return' => Carbon::now()->addDays(10),
            'status' => 'Active',
        ]);
        $this->macbook->update([
            'status' => 'Allocated',
            'holder_id' => $this->employeeIT->id,
            'department_id' => $this->itDept->id,
        ]);

        // 2. Request transfer (Employee HR requests)
        $response = $this->actingAs($this->employeeHR)
            ->postJson('/api/v1/transfers', [
                'asset_id' => $this->macbook->id,
                'to_user_id' => $this->employeeHR->id,
                'reason' => 'Need laptop for HR onboarding campaign.',
            ]);

        $response->assertStatus(201);
        $transferId = $response->json('id');

        $this->assertDatabaseHas('asset_transfers', [
            'id' => $transferId,
            'from_user_id' => $this->employeeIT->id,
            'to_user_id' => $this->employeeHR->id,
            'status' => 'Requested',
        ]);

        // 3. Approval Authorization: Dept Head IT should NOT be able to approve (not recipient's dept head)
        $unauthHeadResponse = $this->actingAs($this->deptHeadIT)
            ->postJson("/api/v1/transfers/{$transferId}/approve");
        $unauthHeadResponse->assertStatus(403);

        // 4. Approval Authorization: Dept Head HR CAN approve (recipient's dept head)
        $approveResponse = $this->actingAs($this->deptHeadHR)
            ->postJson("/api/v1/transfers/{$transferId}/approve");
        $approveResponse->assertStatus(200);

        // 5. Verify database and state transitions
        $this->assertDatabaseHas('asset_transfers', [
            'id' => $transferId,
            'status' => 'Approved',
            'approved_by' => $this->deptHeadHR->id,
        ]);

        // Previous allocation terminated
        $allocation->refresh();
        $this->assertEquals('Returned', $allocation->status);
        $this->assertNotNull($allocation->actual_return);

        // New allocation created for recipient
        $newAllocation = Allocation::where('asset_id', $this->macbook->id)
            ->where('user_id', $this->employeeHR->id)
            ->where('status', 'Active')
            ->first();
        
        $this->assertNotNull($newAllocation);
        $this->assertEquals($this->hrDept->id, $newAllocation->department_id);
        $this->assertEquals($allocation->expected_return->toDateString(), $newAllocation->expected_return->toDateString());

        // Asset updated
        $this->macbook->refresh();
        $this->assertEquals('Allocated', $this->macbook->status);
        $this->assertEquals($this->employeeHR->id, $this->macbook->holder_id);
        $this->assertEquals($this->hrDept->id, $this->macbook->department_id);
    }

    /**
     * Test overdue allocations command.
     */
    public function test_overdue_scheduler_command()
    {
        // 1. Create overdue allocation
        $overdueAllocation = Allocation::create([
            'asset_id' => $this->macbook->id,
            'user_id' => $this->employeeIT->id,
            'department_id' => $this->itDept->id,
            'allocated_date' => Carbon::now()->subDays(10),
            'expected_return' => Carbon::now()->subDays(1),
            'status' => 'Active',
        ]);

        // 2. Create normal allocation (not overdue)
        $macbook2 = Asset::create([
            'name' => 'MacBook Air',
            'serial_number' => 'SN-MAC-8888',
            'category_id' => $this->electronics->id,
            'condition' => 'Good',
            'status' => 'Available',
            'is_bookable' => false,
        ]);
        $normalAllocation = Allocation::create([
            'asset_id' => $macbook2->id,
            'user_id' => $this->employeeHR->id,
            'department_id' => $this->hrDept->id,
            'allocated_date' => Carbon::now()->subDays(2),
            'expected_return' => Carbon::now()->addDays(5),
            'status' => 'Active',
        ]);

        // 3. Run artisan command
        $this->artisan('allocations:check-overdue')
            ->expectsOutput('Successfully marked 1 allocations as overdue.')
            ->assertExitCode(0);

        // 4. Verify updates
        $overdueAllocation->refresh();
        $normalAllocation->refresh();

        $this->assertEquals('Overdue', $overdueAllocation->status);
        $this->assertEquals('Active', $normalAllocation->status);

        // Verify Notification was dispatched for overdue allocation
        $this->assertDatabaseHas('notifications', [
            'recipient_id' => $this->employeeIT->id,
            'type' => 'Alert',
            'title' => 'Allocation Overdue',
        ]);
    }
}
