<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Department;
use App\Models\Category;
use App\Models\Asset;
use App\Models\Allocation;
use App\Models\Booking;
use App\Models\MaintenanceRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Department $department;
    protected Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->department = Department::create([
            'name' => 'IT Dept',
            'status' => 'Active',
        ]);

        $this->user = User::create([
            'name' => 'Test User',
            'email' => 'testuser@example.com',
            'password' => bcrypt('password123'),
            'role' => 'Asset Manager',
            'status' => 'Active',
            'department_id' => $this->department->id,
        ]);

        $this->category = Category::create([
            'name' => 'Laptops',
            'custom_fields' => [],
        ]);
    }

    /**
     * Test get KPIs endpoint.
     */
    public function test_kpis_endpoint_returns_data()
    {
        Sanctum::actingAs($this->user);

        // Seed some assets & allocations
        $asset = Asset::create([
            'name' => 'MacBook Pro',
            'serial_number' => 'MBP-123',
            'category_id' => $this->category->id,
            'status' => 'Available',
            'is_bookable' => true,
            'condition' => 'Good',
        ]);

        $response = $this->getJson('/api/v1/dashboard/kpis');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'total_assets',
                'available_assets',
                'allocated_assets',
                'maintenance_assets',
                'active_bookings',
                'pending_transfers',
                'upcoming_returns',
                'overdue_returns_count',
                'overdue_returns',
            ]);
    }

    /**
     * Test get analytics endpoint.
     */
    public function test_analytics_endpoint_returns_data()
    {
        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/v1/dashboard/analytics');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'booking_density',
                'idle_assets',
                'retiring_assets',
                'maintenance_by_category',
                'department_allocations',
                'most_used_bookable',
                'most_used_allocated',
            ]);
    }

    /**
     * Test reports CSV exports.
     */
    public function test_reports_export_streams_csv()
    {
        Sanctum::actingAs($this->user);

        // Test allocations export
        $response = $this->get('/api/v1/reports/export?type=allocations');
        $response->assertStatus(200);
        $this->assertTrue(str_contains($response->headers->get('Content-Disposition'), 'attachment; filename=allocations_report_'));

        // Test maintenance export
        $response = $this->get('/api/v1/reports/export?type=maintenance');
        $response->assertStatus(200);
        $this->assertTrue(str_contains($response->headers->get('Content-Disposition'), 'attachment; filename=maintenance_report_'));

        // Test audits export
        $response = $this->get('/api/v1/reports/export?type=audits');
        $response->assertStatus(200);
        $this->assertTrue(str_contains($response->headers->get('Content-Disposition'), 'attachment; filename=audits_report_'));
    }
}
