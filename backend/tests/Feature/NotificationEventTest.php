<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Asset;
use App\Models\User;
use App\Models\Department;
use App\Models\Allocation;
use App\Models\AssetTransfer;
use App\Models\Booking;
use App\Models\MaintenanceRequest;
use App\Models\AuditCycle;
use App\Models\AuditLine;
use App\Models\Notification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationEventTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $employeeUser;
    protected Department $department;
    protected Category $category;
    protected Asset $asset;

    protected function setUp(): void
    {
        parent::setUp();

        $this->department = Department::create(['name' => 'IT Services']);
        $this->category = Category::create(['name' => 'Electronics']);

        $this->adminUser = User::create([
            'name' => 'Admin Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('Password123!'),
            'role' => 'Admin',
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

        $this->asset = Asset::create([
            'name' => 'MacBook Pro',
            'category_id' => $this->category->id,
            'acquisition_date' => now(),
            'acquisition_cost' => 120000,
            'condition' => 'Good',
            'location' => 'HQ Lab',
            'status' => 'Available',
            'is_bookable' => true,
        ]);
    }

    public function test_allocation_triggers_asset_assigned_event_and_notification()
    {
        $this->actingAs($this->adminUser);

        $response = $this->postJson('/api/v1/allocations', [
            'asset_id' => $this->asset->id,
            'user_id' => $this->employeeUser->id,
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('notifications', [
            'recipient_id' => $this->employeeUser->id,
            'type' => 'asset_assigned',
            'title' => 'Asset Assigned',
        ]);
    }

    public function test_booking_triggers_booking_confirmed_event_and_notification()
    {
        $this->actingAs($this->employeeUser);

        $response = $this->postJson('/api/v1/bookings', [
            'resource_id' => $this->asset->id,
            'start_datetime' => now()->addHour()->toDateTimeString(),
            'end_datetime' => now()->addHours(2)->toDateTimeString(),
            'purpose' => 'Meeting Room Booking',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('notifications', [
            'recipient_id' => $this->employeeUser->id,
            'type' => 'booking_confirmed',
            'title' => 'Booking Confirmed',
        ]);
    }

    public function test_transfer_triggers_transfer_approved_event_and_notifications()
    {
        // Allocate first
        $this->asset->update([
            'status' => 'Allocated',
            'holder_id' => $this->employeeUser->id,
        ]);

        $recipient = User::create([
            'name' => 'HR Employee',
            'email' => 'hr@example.com',
            'password' => bcrypt('Password123!'),
            'role' => 'Employee',
            'status' => 'Active',
            'department_id' => $this->department->id,
        ]);

        $this->actingAs($this->employeeUser);
        $response = $this->postJson('/api/v1/transfers', [
            'asset_id' => $this->asset->id,
            'to_user_id' => $recipient->id,
            'reason' => 'Need to transfer',
        ]);
        $response->assertStatus(201);
        $transferId = $response->json('id');

        $this->actingAs($this->adminUser);
        $approveResponse = $this->postJson("/api/v1/transfers/{$transferId}/approve");
        $approveResponse->assertStatus(200);

        // Verify notification is sent to both users
        $this->assertDatabaseHas('notifications', [
            'recipient_id' => $recipient->id,
            'type' => 'transfer_approved',
        ]);

        $this->assertDatabaseHas('notifications', [
            'recipient_id' => $this->employeeUser->id,
            'type' => 'transfer_approved',
        ]);
    }

    public function test_discrepancy_triggers_notification_for_managers()
    {
        $this->actingAs($this->adminUser);

        $cycle = AuditCycle::create([
            'name' => 'Q3 Electronics Audit',
            'start_date' => now(),
            'end_date' => now()->addDays(7),
            'status' => 'Open',
            'is_locked' => false,
        ]);

        $line = AuditLine::create([
            'audit_cycle_id' => $cycle->id,
            'asset_id' => $this->asset->id,
            'expected_location' => $this->asset->location,
            'verification' => 'Verified',
        ]);

        // Update line to Damaged
        $response = $this->patchJson("/api/v1/audits/lines/{$line->id}", [
            'verification' => 'Damaged',
            'notes' => 'Screen cracked',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('notifications', [
            'recipient_id' => $this->adminUser->id,
            'type' => 'audit_discrepancy',
        ]);
    }

    public function test_list_and_read_notifications_api()
    {
        $notif = Notification::create([
            'recipient_id' => $this->employeeUser->id,
            'type' => 'asset_assigned',
            'title' => 'Assigned',
            'message' => 'Your MacBook is ready',
            'is_read' => false,
        ]);

        $this->actingAs($this->employeeUser);

        // Get Notifications list
        $response = $this->getJson('/api/v1/notifications');
        $response->assertStatus(200);
        $response->assertJsonCount(1);

        // Mark as read
        $readResponse = $this->patchJson("/api/v1/notifications/{$notif->id}/read");
        $readResponse->assertStatus(200);
        $this->assertTrue($readResponse->json('is_read'));

        // Reset to false and Mark all as read
        $notif->update(['is_read' => false]);
        $readAllResponse = $this->postJson('/api/v1/notifications/read-all');
        $readAllResponse->assertStatus(200);

        $this->assertDatabaseHas('notifications', [
            'id' => $notif->id,
            'is_read' => true,
        ]);
    }
}
