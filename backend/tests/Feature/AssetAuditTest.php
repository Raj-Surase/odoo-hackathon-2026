<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Category;
use App\Models\Department;
use App\Models\AuditCycle;
use App\Models\AuditLine;
use App\Models\DiscrepancyReport;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssetAuditTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $managerUser;
    protected User $auditor1;
    protected User $auditor2;
    protected User $otherUser;
    protected Department $deptIT;
    protected Category $category;
    protected Asset $asset1;
    protected Asset $asset2;
    protected Asset $asset3;

    protected function setUp(): void
    {
        parent::setUp();

        $this->deptIT = Department::create(['name' => 'IT Services']);

        $this->adminUser = User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => bcrypt('password123'),
            'role' => 'Admin',
            'status' => 'Active',
            'department_id' => $this->deptIT->id,
        ]);

        $this->managerUser = User::create([
            'name' => 'Asset Manager',
            'email' => 'manager@example.com',
            'password' => bcrypt('password123'),
            'role' => 'Asset Manager',
            'status' => 'Active',
            'department_id' => $this->deptIT->id,
        ]);

        $this->auditor1 = User::create([
            'name' => 'Auditor One',
            'email' => 'auditor1@example.com',
            'password' => bcrypt('password123'),
            'role' => 'Employee',
            'status' => 'Active',
            'department_id' => $this->deptIT->id,
        ]);

        $this->auditor2 = User::create([
            'name' => 'Auditor Two',
            'email' => 'auditor2@example.com',
            'password' => bcrypt('password123'),
            'role' => 'Employee',
            'status' => 'Active',
            'department_id' => $this->deptIT->id,
        ]);

        $this->otherUser = User::create([
            'name' => 'Other Employee',
            'email' => 'other@example.com',
            'password' => bcrypt('password123'),
            'role' => 'Employee',
            'status' => 'Active',
            'department_id' => $this->deptIT->id,
        ]);

        $this->category = Category::create([
            'name' => 'IT Hardware',
            'custom_fields' => [],
        ]);

        $this->asset1 = Asset::create([
            'name' => 'Laptop A',
            'asset_tag' => 'AF-0001',
            'category_id' => $this->category->id,
            'status' => 'Available',
            'condition' => 'Good',
            'department_id' => $this->deptIT->id,
            'location' => 'Room 101',
        ]);

        $this->asset2 = Asset::create([
            'name' => 'Laptop B',
            'asset_tag' => 'AF-0002',
            'category_id' => $this->category->id,
            'status' => 'Allocated',
            'condition' => 'Good',
            'department_id' => $this->deptIT->id,
            'location' => 'Room 102',
        ]);

        $this->asset3 = Asset::create([
            'name' => 'Office Table',
            'asset_tag' => 'AF-0003',
            'category_id' => $this->category->id,
            'status' => 'Available',
            'condition' => 'Fair',
            'department_id' => null,
            'location' => 'Room 101',
        ]);
    }

    public function test_admin_and_manager_can_create_audit_cycle()
    {
        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/v1/audits', [
                'name' => 'Q3 IT Audit',
                'department_id' => $this->deptIT->id,
                'location' => 'Room 101',
                'start_date' => '2026-07-01',
                'end_date' => '2026-07-15',
                'auditor_ids' => [$this->auditor1->id, $this->auditor2->id],
            ]);

        $response->assertStatus(201);
        $response->assertJsonPath('name', 'Q3 IT Audit');
        $response->assertJsonPath('status', 'Open');
        $response->assertJsonCount(2, 'auditors');
        
        // Should only pull asset1 since it matches department_id = deptIT and location = Room 101
        // asset2 has Room 102, asset3 has department_id = null.
        $response->assertJsonCount(1, 'lines');
        $this->assertDatabaseHas('audit_cycles', ['name' => 'Q3 IT Audit']);
        $this->assertDatabaseHas('audit_lines', ['asset_id' => $this->asset1->id]);
    }

    public function test_non_manager_cannot_create_audit_cycle()
    {
        $response = $this->actingAs($this->auditor1)
            ->postJson('/api/v1/audits', [
                'name' => 'Q3 IT Audit',
                'start_date' => '2026-07-01',
                'end_date' => '2026-07-15',
                'auditor_ids' => [$this->auditor1->id],
            ]);

        $response->assertStatus(403);
    }

    public function test_scoping_listings_and_details_by_role()
    {
        // Create 2 audit cycles
        $cycle1 = AuditCycle::create([
            'name' => 'Cycle 1 - Assigned',
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-15',
            'status' => 'Open',
        ]);
        $cycle1->auditors()->attach($this->auditor1->id);

        $cycle2 = AuditCycle::create([
            'name' => 'Cycle 2 - Not Assigned',
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-15',
            'status' => 'Open',
        ]);
        $cycle2->auditors()->attach($this->auditor2->id);

        // Auditor 1 can only see Cycle 1 in index
        $resAuditor = $this->actingAs($this->auditor1)->getJson('/api/v1/audits');
        $resAuditor->assertStatus(200);
        $resAuditor->assertJsonCount(1);
        $resAuditor->assertJsonPath('0.name', 'Cycle 1 - Assigned');

        // Admin can see all cycles
        $resAdmin = $this->actingAs($this->adminUser)->getJson('/api/v1/audits');
        $resAdmin->assertStatus(200);
        $resAdmin->assertJsonCount(2);

        // Auditor 1 cannot view Cycle 2 details
        $this->actingAs($this->auditor1)
            ->getJson("/api/v1/audits/{$cycle2->id}")
            ->assertStatus(403);
    }

    public function test_auditor_can_submit_verify_log_generating_discrepancy_and_notifications()
    {
        $cycle = AuditCycle::create([
            'name' => 'Q3 IT Audit',
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-15',
            'status' => 'Open',
        ]);
        $cycle->auditors()->attach($this->auditor1->id);

        $line = AuditLine::create([
            'audit_cycle_id' => $cycle->id,
            'asset_id' => $this->asset1->id,
            'expected_location' => $this->asset1->location,
            'verification' => 'Verified',
        ]);

        // Verify log: mark as Damaged with notes
        $response = $this->actingAs($this->auditor1)
            ->patchJson("/api/v1/audits/lines/{$line->id}", [
                'verification' => 'Damaged',
                'notes' => 'Screen cracked.',
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('verification', 'Damaged');
        $response->assertJsonPath('notes', 'Screen cracked.');

        // Verify draft discrepancy report is generated
        $this->assertDatabaseHas('discrepancy_reports', ['audit_cycle_id' => $cycle->id]);

        // Verify notification was sent to manager/admin
        $this->assertTrue(Notification::where('recipient_id', $this->adminUser->id)
            ->where('type', 'audit_discrepancy')
            ->where('title', 'Audit Discrepancy Flagged')
            ->exists()
        );

        // Mark it back to Verified
        $response2 = $this->actingAs($this->auditor1)
            ->patchJson("/api/v1/audits/lines/{$line->id}", [
                'verification' => 'Verified',
                'notes' => null,
            ]);

        $response2->assertStatus(200);
        // Verify discrepancy report is deleted since no flagged lines exist
        $this->assertDatabaseMissing('discrepancy_reports', ['audit_cycle_id' => $cycle->id]);
    }

    public function test_close_and_lock_audit_cycle_cascades_status_updates()
    {
        $cycle = AuditCycle::create([
            'name' => 'Q3 IT Audit',
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-15',
            'status' => 'Open',
        ]);
        $cycle->auditors()->attach($this->auditor1->id);

        $line1 = AuditLine::create([
            'audit_cycle_id' => $cycle->id,
            'asset_id' => $this->asset1->id,
            'expected_location' => $this->asset1->location,
            'verification' => 'Missing',
        ]);

        $line2 = AuditLine::create([
            'audit_cycle_id' => $cycle->id,
            'asset_id' => $this->asset2->id,
            'expected_location' => $this->asset2->location,
            'verification' => 'Damaged',
        ]);

        // Create initial draft discrepancy report
        $report = DiscrepancyReport::create([
            'audit_cycle_id' => $cycle->id,
            'generated_date' => now()->subDay(),
        ]);

        // Close the cycle
        $response = $this->actingAs($this->managerUser)
            ->postJson("/api/v1/audits/{$cycle->id}/close");

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'Closed');
        $response->assertJsonPath('is_locked', true);

        // Verify assets statuses
        $this->asset1->refresh();
        $this->asset2->refresh();

        $this->assertEquals('Lost', $this->asset1->status);
        $this->assertEquals('Damaged', $this->asset2->condition);

        // Verify discrepancy report date is finalized
        $report->refresh();
        $this->assertNotEquals($report->generated_date->format('Y-m-d H:i:s'), now()->subDay()->format('Y-m-d H:i:s'));

        // Cannot update lines of locked cycle
        $this->actingAs($this->auditor1)
            ->patchJson("/api/v1/audits/lines/{$line1->id}", [
                'verification' => 'Verified',
            ])
            ->assertStatus(422);
    }
}
