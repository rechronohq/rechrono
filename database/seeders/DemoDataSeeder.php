<?php

namespace Database\Seeders;

use App\Models\Team;
use App\Support\StarterWorkspaceSeeder;
use Illuminate\Database\Seeder;

class DemoDataSeeder extends Seeder
{
    /**
     * Seed sample projects and tasks for local development and tests.
     */
    public function run(): void
    {
        $team = Team::query()->first() ?? Team::query()->create([
            'name' => 'Demo Team',
            'slug' => 'demo-team',
        ]);

        app(StarterWorkspaceSeeder::class)->seed($team);
    }
}
