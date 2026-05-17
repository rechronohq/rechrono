<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teams', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->foreignUuid('team_id')->nullable()->after('id')->constrained('teams')->nullOnDelete();
            $table->index('team_id');
        });

        Schema::table('projects', function (Blueprint $table): void {
            $table->foreignUuid('team_id')->nullable()->after('id')->constrained('teams')->cascadeOnDelete();
            $table->index(['team_id', 'parent_id']);
        });

        Schema::table('timeline_views', function (Blueprint $table): void {
            $table->foreignUuid('team_id')->nullable()->after('id')->constrained('teams')->cascadeOnDelete();
            $table->index(['team_id', 'user_id']);
        });

        $this->backfillExistingPlannerData();
    }

    public function down(): void
    {
        Schema::table('timeline_views', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('team_id');
        });

        Schema::table('projects', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('team_id');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('team_id');
        });

        Schema::dropIfExists('teams');
    }

    protected function backfillExistingPlannerData(): void
    {
        $hasExistingData = DB::table('users')->exists()
            || DB::table('projects')->exists()
            || DB::table('timeline_views')->exists();

        if (! $hasExistingData) {
            return;
        }

        $ownerId = DB::table('users')->orderByDesc('is_admin')->orderBy('id')->value('id');
        $teamId = (string) Str::uuid();

        DB::table('teams')->insert([
            'id' => $teamId,
            'name' => 'Default Team',
            'slug' => 'default-team',
            'owner_user_id' => $ownerId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('users')->whereNull('team_id')->update(['team_id' => $teamId]);
        DB::table('projects')->whereNull('team_id')->update(['team_id' => $teamId]);
        DB::table('timeline_views')->whereNull('team_id')->update(['team_id' => $teamId]);
    }
};
