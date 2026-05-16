<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed demo planner data (no users).
     *
     * Prefer `php artisan rechrono:setup` for first-time local setup.
     */
    public function run(): void
    {
        $this->call(DemoDataSeeder::class);
    }
}
