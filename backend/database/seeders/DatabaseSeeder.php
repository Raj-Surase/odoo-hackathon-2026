<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Department;
use App\Models\Category;
use App\Models\Asset;
use App\Models\Allocation;
use App\Models\Booking;
use App\Models\MaintenanceRequest;
use App\Models\Notification;
use App\Models\AuditLog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create temporary/initial users to act as Department Heads & Employees
        $password = Hash::make('password123');

        $aditi = User::create([
            'name' => 'Aditi Rao',
            'email' => 'aditi@example.com',
            'password' => $password,
            'role' => 'Dept Head',
            'status' => 'Active',
        ]);

        $rohan = User::create([
            'name' => 'Rohan Mehta',
            'email' => 'rohan@example.com',
            'password' => $password,
            'role' => 'Dept Head',
            'status' => 'Active',
        ]);

        $sana = User::create([
            'name' => 'Sana Iqbal',
            'email' => 'sana@example.com',
            'password' => $password,
            'role' => 'Dept Head',
            'status' => 'Inactive', // Sana Iqbal is Inactive in Field Ops (East)
        ]);

        $priya = User::create([
            'name' => 'Priya Shah',
            'email' => 'priya@example.com',
            'password' => $password,
            'role' => 'Employee',
            'status' => 'Active',
        ]);

        $rahul = User::create([
            'name' => 'Rahul Varma',
            'email' => 'rahul@example.com',
            'password' => $password,
            'role' => 'Employee',
            'status' => 'Active',
        ]);

        $manager = User::create([
            'name' => 'Asset Manager User',
            'email' => 'manager@example.com',
            'password' => $password,
            'role' => 'Asset Manager',
            'status' => 'Active',
        ]);

        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => $password,
            'role' => 'Admin',
            'status' => 'Active',
        ]);

        // 2. Create Departments
        $engineering = Department::create([
            'name' => 'Engineering',
            'head_id' => $aditi->id,
            'parent_id' => null,
            'status' => 'Active',
        ]);

        $facilities = Department::create([
            'name' => 'Facilities',
            'head_id' => $rohan->id,
            'parent_id' => null,
            'status' => 'Active',
        ]);

        $fieldOpsParent = Department::create([
            'name' => 'Field Ops',
            'head_id' => null,
            'parent_id' => null,
            'status' => 'Active',
        ]);

        $fieldOpsEast = Department::create([
            'name' => 'Field Ops (East)',
            'head_id' => $sana->id,
            'parent_id' => $fieldOpsParent->id,
            'status' => 'Inactive', // Field Ops (East) status is Inactive
        ]);

        // 3. Associate Users with their Departments
        $aditi->update(['department_id' => $engineering->id]);
        $priya->update(['department_id' => $engineering->id]);
        
        $rohan->update(['department_id' => $facilities->id]);
        $rahul->update(['department_id' => $facilities->id]);
        
        $sana->update(['department_id' => $fieldOpsEast->id]);
        $manager->update(['department_id' => $facilities->id]);
        $admin->update(['department_id' => $facilities->id]);

        // 4. Create Categories
        $electronics = Category::create([
            'name' => 'Electronics',
            'custom_fields' => [
                ['name' => 'RAM', 'type' => 'text', 'required' => true],
                ['name' => 'Storage', 'type' => 'text', 'required' => true],
                ['name' => 'Processor', 'type' => 'text', 'required' => false],
            ],
        ]);

        $furniture = Category::create([
            'name' => 'Furniture',
            'custom_fields' => [
                ['name' => 'Dimensions', 'type' => 'text', 'required' => false],
                ['name' => 'Material', 'type' => 'text', 'required' => true],
            ],
        ]);

        $vehicles = Category::create([
            'name' => 'Vehicles',
            'custom_fields' => [
                ['name' => 'License Plate', 'type' => 'text', 'required' => true],
                ['name' => 'Year', 'type' => 'number', 'required' => true],
            ],
        ]);

        // 5. Create Assets
        $laptop = Asset::create([
            'name' => 'Dell Laptop',
            'asset_tag' => 'AF-0012',
            'serial_number' => 'SN-DELL-12345',
            'category_id' => $electronics->id,
            'acquisition_date' => Carbon::parse('2024-01-15'),
            'acquisition_cost' => 75000.00,
            'condition' => 'Good',
            'location' => 'Bengaluru',
            'status' => 'Allocated',
            'is_bookable' => false,
            'department_id' => $engineering->id,
            'holder_id' => $priya->id,
        ]);

        $projector = Asset::create([
            'name' => 'Projector',
            'asset_tag' => 'AF-0062',
            'serial_number' => 'SN-PROJ-98765',
            'category_id' => $electronics->id,
            'acquisition_date' => Carbon::parse('2024-03-22'),
            'acquisition_cost' => 45000.00,
            'condition' => 'Fair',
            'location' => 'HQ Floor 2',
            'status' => 'Under Maintenance',
            'is_bookable' => true,
            'department_id' => $facilities->id,
            'holder_id' => null,
        ]);

        $chair = Asset::create([
            'name' => 'Office Chair',
            'asset_tag' => 'AF-0201',
            'serial_number' => 'SN-CHAIR-4455',
            'category_id' => $furniture->id,
            'acquisition_date' => Carbon::parse('2025-05-10'),
            'acquisition_cost' => 8500.00,
            'condition' => 'Good',
            'location' => 'Warehouse',
            'status' => 'Available',
            'is_bookable' => false,
            'department_id' => null,
            'holder_id' => null,
        ]);

        $acUnit = Asset::create([
            'name' => 'AC Unit',
            'asset_tag' => 'AF-0003',
            'serial_number' => 'SN-AC-0099',
            'category_id' => $furniture->id, // or custom
            'acquisition_date' => Carbon::parse('2024-06-12'),
            'acquisition_cost' => 35000.00,
            'condition' => 'Good',
            'location' => 'Server Room',
            'status' => 'Available',
            'is_bookable' => false,
            'department_id' => $facilities->id,
            'holder_id' => null,
        ]);

        $roomB2 = Asset::create([
            'name' => 'Room B2',
            'asset_tag' => 'AF-0099',
            'serial_number' => null,
            'category_id' => $furniture->id,
            'acquisition_date' => Carbon::parse('2023-01-01'),
            'acquisition_cost' => 0.00,
            'condition' => 'Good',
            'location' => 'Floor 2',
            'status' => 'Available',
            'is_bookable' => true,
            'department_id' => null,
            'holder_id' => null,
        ]);

        // 6. Create Allocations
        Allocation::create([
            'asset_id' => $laptop->id,
            'user_id' => $priya->id,
            'department_id' => $engineering->id,
            'allocated_date' => Carbon::now()->subMonths(6),
            'expected_return' => Carbon::now()->addMonths(6),
            'status' => 'Active',
        ]);

        Allocation::create([
            'asset_id' => $chair->id,
            'user_id' => $rahul->id,
            'department_id' => $facilities->id,
            'allocated_date' => Carbon::now()->subMonths(2),
            'expected_return' => Carbon::now()->subMonths(1),
            'actual_return' => Carbon::now()->subMonths(1),
            'condition_notes' => 'Returned in good shape',
            'status' => 'Returned',
        ]);

        // 7. Create Bookings
        Booking::create([
            'resource_id' => $roomB2->id,
            'user_id' => $priya->id,
            'department_id' => $engineering->id,
            'start_datetime' => Carbon::now()->subHours(2),
            'end_datetime' => Carbon::now()->subHours(1),
            'purpose' => 'Sprint Planning',
            'status' => 'Completed',
        ]);

        Booking::create([
            'resource_id' => $roomB2->id,
            'user_id' => $aditi->id,
            'department_id' => $engineering->id,
            'start_datetime' => Carbon::now()->addDays(1)->setHour(14)->setMinute(0),
            'end_datetime' => Carbon::now()->addDays(1)->setHour(15)->setMinute(0),
            'purpose' => 'Architecture Review',
            'status' => 'Upcoming',
        ]);

        // 8. Create Maintenance Requests
        MaintenanceRequest::create([
            'asset_id' => $projector->id,
            'user_id' => $rohan->id,
            'issue_description' => 'Projector bulb flickers and turns off after 5 minutes.',
            'priority' => 'High',
            'technician_id' => $rahul->id, // Assigned to Rahul Varma
            'status' => 'Technician Assigned',
            'approved_by' => $manager->id,
        ]);

        MaintenanceRequest::create([
            'asset_id' => $acUnit->id,
            'user_id' => $rahul->id,
            'issue_description' => 'AC noisy compressor on starting up.',
            'priority' => 'Medium',
            'status' => 'Approved',
            'approved_by' => $manager->id,
        ]);

        MaintenanceRequest::create([
            'asset_id' => $chair->id,
            'user_id' => $rahul->id,
            'issue_description' => 'Chair armrest was loose.',
            'priority' => 'Low',
            'status' => 'Resolved',
            'approved_by' => $manager->id,
            'resolution_notes' => 'Tightened armrest screws.',
            'resolution_date' => Carbon::now()->subDays(5),
        ]);

        // 9. Create Notifications
        Notification::create([
            'recipient_id' => $priya->id,
            'type' => 'Alert',
            'title' => 'Asset Assigned',
            'message' => 'Laptop AF-0012 assigned to Priya Shah',
            'is_read' => false,
            'reference_type' => Asset::class,
            'reference_id' => $laptop->id,
            'created_at' => Carbon::now()->subMinutes(2),
        ]);

        Notification::create([
            'recipient_id' => $manager->id,
            'type' => 'Approval',
            'title' => 'Maintenance Approved',
            'message' => 'Maintenance request for Projector (AF-0062) approved',
            'is_read' => true,
            'reference_type' => MaintenanceRequest::class,
            'reference_id' => 1,
            'created_at' => Carbon::now()->subMinutes(18),
        ]);

        Notification::create([
            'recipient_id' => $priya->id,
            'type' => 'Booking',
            'title' => 'Booking Confirmed',
            'message' => 'Booking confirmed: Room B2 2:00-3:00 PM',
            'is_read' => false,
            'reference_type' => Booking::class,
            'reference_id' => 1,
            'created_at' => Carbon::now()->subHours(1),
        ]);

        // 10. Create Audit Logs
        AuditLog::create([
            'user_id' => $manager->id,
            'action' => 'CREATE',
            'model' => 'Asset',
            'record_id' => $laptop->id,
            'new_values' => $laptop->toArray(),
            'timestamp' => Carbon::now()->subMonths(6),
        ]);

        AuditLog::create([
            'user_id' => $manager->id,
            'action' => 'UPDATE',
            'model' => 'Asset',
            'record_id' => $projector->id,
            'old_values' => ['status' => 'Available'],
            'new_values' => ['status' => 'Under Maintenance'],
            'timestamp' => Carbon::now()->subDays(2),
        ]);
    }
}
