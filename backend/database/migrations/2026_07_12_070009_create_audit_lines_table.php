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
        Schema::create('audit_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audit_cycle_id')->constrained('audit_cycles')->cascadeOnDelete();
            $table->foreignId('asset_id')->constrained('assets')->cascadeOnDelete();
            $table->string('expected_location')->nullable();
            $table->string('verification')->default('Verified');
            $table->text('notes')->nullable();
            $table->foreignId('audited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_lines');
    }
};
