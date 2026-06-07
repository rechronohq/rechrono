<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('team_id')->constrained('teams')->cascadeOnDelete();
            $table->string('name');
            $table->text('address')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->index(['team_id', 'name']);
        });

        Schema::create('client_contacts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('client_id')->constrained('clients')->cascadeOnDelete();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('job_title')->nullable();
            $table->timestamps();
            $table->index(['client_id', 'name']);
        });

        Schema::table('projects', function (Blueprint $table): void {
            $table->foreignUuid('client_id')->nullable()->after('team_id')->constrained('clients')->restrictOnDelete();
            $table->index(['team_id', 'client_id']);
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table): void {
            $table->dropIndex(['team_id', 'client_id']);
            $table->dropConstrainedForeignId('client_id');
        });

        Schema::dropIfExists('client_contacts');
        Schema::dropIfExists('clients');
    }
};
