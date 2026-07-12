<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Asset;
use App\Models\User;
use App\Models\Department;
use App\Models\Booking;
use App\Models\Notification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Carbon\Carbon;

class ResourceBookingTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $managerUser;
    protected User $deptHeadIT;
    protected User $employeeIT;
    protected User $employeeHR;
    protected Department $itDept;
    protected Department $hrDept;
    protected Category $electronics;
    protected Asset $conferenceRoom;
    protected Asset $nonBookableLaptop;

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
            'custom_fields' => [],
        ]);

        $this->conferenceRoom = Asset::create([
            'name' => 'Conference Room B2',
            'asset_tag' => 'AF-0001',
            'category_id' => $this->electronics->id,
            'status' => 'Available',
            'condition' => 'Good',
            'is_bookable' => true,
        ]);

        $this->nonBookableLaptop = Asset::create([
            'name' => 'IT Laptop',
            'asset_tag' => 'AF-0002',
            'category_id' => $this->electronics->id,
            'status' => 'Available',
            'condition' => 'Good',
            'is_bookable' => false,
        ]);
    }

    /**
     * Test booking list is accessible and scoped appropriately.
     */
    public function test_booking_list_scoping()
    {
        // Create a booking for employee IT
        $bookingIT = Booking::create([
            'resource_id' => $this->conferenceRoom->id,
            'user_id' => $this->employeeIT->id,
            'department_id' => $this->itDept->id,
            'start_datetime' => Carbon::now()->addHours(1),
            'end_datetime' => Carbon::now()->addHours(2),
            'status' => 'Upcoming',
        ]);

        // Create a booking for employee HR
        $bookingHR = Booking::create([
            'resource_id' => $this->conferenceRoom->id,
            'user_id' => $this->employeeHR->id,
            'department_id' => $this->hrDept->id,
            'start_datetime' => Carbon::now()->addHours(3),
            'end_datetime' => Carbon::now()->addHours(4),
            'status' => 'Upcoming',
        ]);

        // IT Employee should only see their own bookings
        $response = $this->actingAs($this->employeeIT, 'sanctum')->getJson('/api/v1/bookings');
        $response->assertStatus(200);
        $this->assertCount(1, $response->json());
        $this->assertEquals($bookingIT->id, $response->json()[0]['id']);

        // HR Employee should only see their own bookings
        $response = $this->actingAs($this->employeeHR, 'sanctum')->getJson('/api/v1/bookings');
        $response->assertStatus(200);
        $this->assertCount(1, $response->json());
        $this->assertEquals($bookingHR->id, $response->json()[0]['id']);

        // Dept Head IT should see their own + IT department bookings
        $response = $this->actingAs($this->deptHeadIT, 'sanctum')->getJson('/api/v1/bookings');
        $response->assertStatus(200);
        $this->assertCount(1, $response->json());
        $this->assertEquals($bookingIT->id, $response->json()[0]['id']);

        // Admin/Asset Manager should see all bookings
        $response = $this->actingAs($this->adminUser, 'sanctum')->getJson('/api/v1/bookings');
        $response->assertStatus(200);
        $this->assertCount(2, $response->json());
    }

    /**
     * Test booking creation validation rules.
     */
    public function test_booking_creation_validations()
    {
        // 1. Success case: Book a bookable resource in the future
        $response = $this->actingAs($this->employeeIT, 'sanctum')->postJson('/api/v1/bookings', [
            'resource_id' => $this->conferenceRoom->id,
            'start_datetime' => Carbon::now()->addHours(2)->toDateTimeString(),
            'end_datetime' => Carbon::now()->addHours(3)->toDateTimeString(),
            'purpose' => 'Scrum planning session',
        ]);
        $response->assertStatus(201);
        $response->assertJsonPath('status', 'Upcoming');

        // Check notification was sent
        $this->assertTrue(Notification::where('recipient_id', $this->employeeIT->id)->where('title', 'Booking Confirmed')->exists());

        // 2. Reject booking on a non-bookable asset
        $response = $this->actingAs($this->employeeIT, 'sanctum')->postJson('/api/v1/bookings', [
            'resource_id' => $this->nonBookableLaptop->id,
            'start_datetime' => Carbon::now()->addHours(4)->toDateTimeString(),
            'end_datetime' => Carbon::now()->addHours(5)->toDateTimeString(),
        ]);
        $response->assertStatus(422);
        $response->assertJsonFragment(['message' => 'This asset is not available for booking.']);

        // 3. Reject booking with end time before start time
        $response = $this->actingAs($this->employeeIT, 'sanctum')->postJson('/api/v1/bookings', [
            'resource_id' => $this->conferenceRoom->id,
            'start_datetime' => Carbon::now()->addHours(5)->toDateTimeString(),
            'end_datetime' => Carbon::now()->addHours(4)->toDateTimeString(),
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['end_datetime']);

        // 4. Reject booking starting in the past
        $response = $this->actingAs($this->employeeIT, 'sanctum')->postJson('/api/v1/bookings', [
            'resource_id' => $this->conferenceRoom->id,
            'start_datetime' => Carbon::now()->subHours(2)->toDateTimeString(),
            'end_datetime' => Carbon::now()->addHours(1)->toDateTimeString(),
        ]);
        $response->assertStatus(422);
        $response->assertJsonFragment(['message' => 'Cannot book a time slot in the past.']);
    }

    /**
     * Test zero-overlap validator algorithm.
     */
    public function test_zero_overlap_validation()
    {
        // Setup initial booking: 10:00 AM - 11:00 AM (tomorrow)
        $start = Carbon::tomorrow()->setTime(10, 0);
        $end = Carbon::tomorrow()->setTime(11, 0);

        Booking::create([
            'resource_id' => $this->conferenceRoom->id,
            'user_id' => $this->employeeIT->id,
            'department_id' => $this->itDept->id,
            'start_datetime' => $start,
            'end_datetime' => $end,
            'status' => 'Upcoming',
        ]);

        // Attempting overlapping: 9:30 AM - 10:30 AM (Should FAIL)
        $response = $this->actingAs($this->employeeHR, 'sanctum')->postJson('/api/v1/bookings', [
            'resource_id' => $this->conferenceRoom->id,
            'start_datetime' => Carbon::tomorrow()->setTime(9, 30)->toDateTimeString(),
            'end_datetime' => Carbon::tomorrow()->setTime(10, 30)->toDateTimeString(),
        ]);
        $response->assertStatus(422);
        $response->assertJsonFragment(['message' => 'Conflict - slot is unavailable.']);

        // Attempting overlapping: 10:30 AM - 11:30 AM (Should FAIL)
        $response = $this->actingAs($this->employeeHR, 'sanctum')->postJson('/api/v1/bookings', [
            'resource_id' => $this->conferenceRoom->id,
            'start_datetime' => Carbon::tomorrow()->setTime(10, 30)->toDateTimeString(),
            'end_datetime' => Carbon::tomorrow()->setTime(11, 30)->toDateTimeString(),
        ]);
        $response->assertStatus(422);

        // Attempting fully encapsulated: 10:15 AM - 10:45 AM (Should FAIL)
        $response = $this->actingAs($this->employeeHR, 'sanctum')->postJson('/api/v1/bookings', [
            'resource_id' => $this->conferenceRoom->id,
            'start_datetime' => Carbon::tomorrow()->setTime(10, 15)->toDateTimeString(),
            'end_datetime' => Carbon::tomorrow()->setTime(10, 45)->toDateTimeString(),
        ]);
        $response->assertStatus(422);

        // Success adjacent: 9:00 AM - 10:00 AM (Starts exactly when booking begins or ends - Should PASS)
        $response = $this->actingAs($this->employeeHR, 'sanctum')->postJson('/api/v1/bookings', [
            'resource_id' => $this->conferenceRoom->id,
            'start_datetime' => Carbon::tomorrow()->setTime(9, 0)->toDateTimeString(),
            'end_datetime' => Carbon::tomorrow()->setTime(10, 0)->toDateTimeString(),
        ]);
        $response->assertStatus(201);

        // Success adjacent: 11:00 AM - 12:00 PM (Should PASS)
        $response = $this->actingAs($this->employeeHR, 'sanctum')->postJson('/api/v1/bookings', [
            'resource_id' => $this->conferenceRoom->id,
            'start_datetime' => Carbon::tomorrow()->setTime(11, 0)->toDateTimeString(),
            'end_datetime' => Carbon::tomorrow()->setTime(12, 0)->toDateTimeString(),
        ]);
        $response->assertStatus(201);
    }

    /**
     * Test booking cancellation and permissions.
     */
    public function test_booking_cancellation()
    {
        $start = Carbon::tomorrow()->setTime(14, 0);
        $end = Carbon::tomorrow()->setTime(15, 0);

        $booking = Booking::create([
            'resource_id' => $this->conferenceRoom->id,
            'user_id' => $this->employeeIT->id,
            'department_id' => $this->itDept->id,
            'start_datetime' => $start,
            'end_datetime' => $end,
            'status' => 'Upcoming',
        ]);

        // 1. Employee HR attempts to cancel Employee IT's booking (Should FAIL)
        $response = $this->actingAs($this->employeeHR, 'sanctum')->postJson("/api/v1/bookings/{$booking->id}/cancel");
        $response->assertStatus(403);
        $this->assertEquals('Upcoming', $booking->fresh()->status);

        // 2. Booker (Employee IT) cancels their own booking (Should PASS)
        $response = $this->actingAs($this->employeeIT, 'sanctum')->postJson("/api/v1/bookings/{$booking->id}/cancel");
        $response->assertStatus(200);
        $this->assertEquals('Cancelled', $booking->fresh()->status);

        // Check cancellation notification was sent
        $this->assertTrue(Notification::where('recipient_id', $this->employeeIT->id)->where('title', 'Booking Cancelled')->exists());

        // Re-setup a new booking
        $booking2 = Booking::create([
            'resource_id' => $this->conferenceRoom->id,
            'user_id' => $this->employeeIT->id,
            'department_id' => $this->itDept->id,
            'start_datetime' => $start,
            'end_datetime' => $end,
            'status' => 'Upcoming',
        ]);

        // 3. Admin cancels the booking (Should PASS)
        $response = $this->actingAs($this->adminUser, 'sanctum')->postJson("/api/v1/bookings/{$booking2->id}/cancel");
        $response->assertStatus(200);
        $this->assertEquals('Cancelled', $booking2->fresh()->status);

        // 4. Try cancelling non-upcoming bookings
        $bookingPast = Booking::create([
            'resource_id' => $this->conferenceRoom->id,
            'user_id' => $this->employeeIT->id,
            'department_id' => $this->itDept->id,
            'start_datetime' => Carbon::now()->subHours(5),
            'end_datetime' => Carbon::now()->subHours(4),
            'status' => 'Completed',
        ]);
        $response = $this->actingAs($this->adminUser, 'sanctum')->postJson("/api/v1/bookings/{$bookingPast->id}/cancel");
        $response->assertStatus(422);
    }

    /**
     * Test booking scheduled state machine command.
     */
    public function test_booking_reminder_and_state_transitions()
    {
        // 1. Upcoming booking starting in 10 minutes (should get notification & transition to Ongoing when command runs if start time passes)
        $bookingToStart = Booking::create([
            'resource_id' => $this->conferenceRoom->id,
            'user_id' => $this->employeeIT->id,
            'department_id' => $this->itDept->id,
            'start_datetime' => Carbon::now()->addMinutes(10),
            'end_datetime' => Carbon::now()->addMinutes(40),
            'status' => 'Upcoming',
        ]);

        // 2. Run command to send reminders (it won't transition yet because start time is in the future +10m)
        $this->artisan('bookings:update-and-remind')
            ->expectsOutputToContain('sent 1 reminders');

        $this->assertTrue(Notification::where('recipient_id', $this->employeeIT->id)->where('title', 'Booking Reminder')->exists());
        $this->assertEquals('Upcoming', $bookingToStart->fresh()->status);

        // 3. Move current time past start time of bookingToStart
        Carbon::setTestNow(Carbon::now()->addMinutes(15));

        // Running command again should transition bookingToStart to Ongoing
        $this->artisan('bookings:update-and-remind')
            ->expectsOutputToContain('Updated 1 to Ongoing');

        $this->assertEquals('Ongoing', $bookingToStart->fresh()->status);

        // 4. Move current time past end time of bookingToStart
        Carbon::setTestNow(Carbon::now()->addMinutes(45));

        // Running command again should transition bookingToStart to Completed
        $this->artisan('bookings:update-and-remind')
            ->expectsOutputToContain('1 to Completed');

        $this->assertEquals('Completed', $bookingToStart->fresh()->status);

        // Reset time
        Carbon::setTestNow();
    }
}
