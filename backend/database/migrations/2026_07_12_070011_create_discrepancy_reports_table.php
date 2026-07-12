<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('discrepancy_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audit_cycle_id')->constrained('audit_cycles')->cascadeOnDelete();
            $table->dateTime('generated_date');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('discrepancy_reports');
    }
};
