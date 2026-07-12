<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Asset;
use App\Models\User;
use App\Models\Department;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $regularUser;
    protected Category $electronics;

    protected function setUp(): void
    {
        parent::setUp();

        $dept = Department::create(['name' => 'IT']);

        $this->adminUser = User::create([
            'name' => 'Admin Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('Password123!'),
            'role' => 'Admin',
            'status' => 'Active',
            'department_id' => $dept->id,
        ]);

        $this->regularUser = User::create([
            'name' => 'Regular User',
            'email' => 'user@example.com',
            'password' => bcrypt('Password123!'),
            'role' => 'Employee',
            'status' => 'Active',
            'department_id' => $dept->id,
        ]);

        $this->electronics = Category::create([
            'name' => 'Electronics',
            'custom_fields' => [
                ['name' => 'RAM', 'type' => 'text', 'required' => true],
            ],
        ]);
    }

    public function test_authenticated_user_can_list_categories()
    {
        $response = $this->actingAs($this->regularUser)
            ->getJson('/api/v1/categories');

        $response->assertStatus(200);
        $response->assertJsonCount(1);
    }

    public function test_admin_can_create_category_with_custom_fields()
    {
        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/v1/categories', [
                'name' => 'Vehicles',
                'custom_fields' => [
                    ['name' => 'Mileage', 'type' => 'number', 'required' => true],
                    ['name' => 'Color', 'type' => 'text', 'required' => false],
                ],
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('categories', [
            'name' => 'Vehicles',
        ]);
    }

    public function test_create_category_validates_custom_fields_structure()
    {
        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/v1/categories', [
                'name' => 'Furniture',
                'custom_fields' => [
                    ['name' => 'Weight', 'type' => 'invalid_type', 'required' => true], // Invalid type
                ],
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['custom_fields.0.type']);
    }

    public function test_admin_can_update_category()
    {
        $response = $this->actingAs($this->adminUser)
            ->putJson("/api/v1/categories/{$this->electronics->id}", [
                'name' => 'Consumer Electronics',
                'custom_fields' => [
                    ['name' => 'RAM', 'type' => 'text', 'required' => true],
                    ['name' => 'Storage', 'type' => 'text', 'required' => true],
                ],
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('categories', [
            'id' => $this->electronics->id,
            'name' => 'Consumer Electronics',
        ]);
    }

    public function test_admin_cannot_delete_category_with_assigned_assets()
    {
        // Create an asset in the category
        Asset::create([
            'name' => 'Test Laptop',
            'asset_tag' => 'AF-9999',
            'category_id' => $this->electronics->id,
            'condition' => 'Good',
            'location' => 'HQ',
            'status' => 'Available',
            'is_bookable' => false,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->deleteJson("/api/v1/categories/{$this->electronics->id}");

        $response->assertStatus(400);
        $response->assertJsonFragment([
            'message' => 'Cannot delete a category that has registered assets.'
        ]);
        $this->assertDatabaseHas('categories', ['id' => $this->electronics->id]);
    }

    public function test_admin_can_delete_unassigned_category()
    {
        $response = $this->actingAs($this->adminUser)
            ->deleteJson("/api/v1/categories/{$this->electronics->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('categories', ['id' => $this->electronics->id]);
    }
}
