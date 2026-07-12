<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;

// Models
use App\Models\User;
use App\Models\Asset;
use App\Models\Department;
use App\Models\Category;
use App\Models\Booking;
use App\Models\Allocation;
use App\Models\AssetTransfer;
use App\Models\MaintenanceRequest;
use App\Models\AuditCycle;
use App\Models\DiscrepancyReport;
use App\Models\Notification;
use App\Models\AuditLog;

// Policies
use App\Policies\UserPolicy;
use App\Policies\AssetPolicy;
use App\Policies\DepartmentPolicy;
use App\Policies\CategoryPolicy;
use App\Policies\BookingPolicy;
use App\Policies\AllocationPolicy;
use App\Policies\AssetTransferPolicy;
use App\Policies\MaintenanceRequestPolicy;
use App\Policies\AuditCyclePolicy;
use App\Policies\DiscrepancyReportPolicy;
use App\Policies\NotificationPolicy;
use App\Policies\AuditLogPolicy;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Explicitly register policies
        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(Asset::class, AssetPolicy::class);
        Gate::policy(Department::class, DepartmentPolicy::class);
        Gate::policy(Category::class, CategoryPolicy::class);
        Gate::policy(Booking::class, BookingPolicy::class);
        Gate::policy(Allocation::class, AllocationPolicy::class);
        Gate::policy(AssetTransfer::class, AssetTransferPolicy::class);
        Gate::policy(MaintenanceRequest::class, MaintenanceRequestPolicy::class);
        Gate::policy(AuditCycle::class, AuditCyclePolicy::class);
        Gate::policy(DiscrepancyReport::class, DiscrepancyReportPolicy::class);
        Gate::policy(Notification::class, NotificationPolicy::class);
        Gate::policy(AuditLog::class, AuditLogPolicy::class);

        // Define admin gate
        Gate::define('admin', function (User $user) {
            return $user->isAdmin();
        });

        // Register MaintenanceRequest Observer
        \App\Models\MaintenanceRequest::observe(\App\Observers\MaintenanceRequestObserver::class);

        // Register Event Listeners
        \Illuminate\Support\Facades\Event::listen(\App\Events\AssetAssigned::class, \App\Listeners\WriteNotification::class);
        \Illuminate\Support\Facades\Event::listen(\App\Events\MaintenanceApproved::class, \App\Listeners\WriteNotification::class);
        \Illuminate\Support\Facades\Event::listen(\App\Events\BookingConfirmed::class, \App\Listeners\WriteNotification::class);
        \Illuminate\Support\Facades\Event::listen(\App\Events\TransferApproved::class, \App\Listeners\WriteNotification::class);
        \Illuminate\Support\Facades\Event::listen(\App\Events\AuditDiscrepancyFlagged::class, \App\Listeners\WriteNotification::class);
    }
}
