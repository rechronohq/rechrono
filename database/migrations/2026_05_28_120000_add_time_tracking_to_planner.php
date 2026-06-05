<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teams', function (Blueprint $table): void {
            $table->boolean('time_tracking_enabled')->default(false)->after('owner_user_id');
        });

        Schema::table('projects', function (Blueprint $table): void {
            $table->decimal('budget_hours', 8, 2)->nullable()->after('description');
        });

        Schema::create('time_entries', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignUuid('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->dateTime('started_at');
            $table->dateTime('ended_at')->nullable();
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['team_id', 'started_at']);
            $table->index(['user_id', 'ended_at']);
            $table->index(['task_id', 'started_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('time_entries');

        Schema::table('projects', function (Blueprint $table): void {
            $table->dropColumn('budget_hours');
        });

        Schema::table('teams', function (Blueprint $table): void {
            $table->dropColumn('time_tracking_enabled');
        });
    }
};
