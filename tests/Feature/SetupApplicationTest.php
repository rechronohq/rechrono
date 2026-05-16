<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SetupApplicationTest extends TestCase
{
    use RefreshDatabase;

    public function test_setup_command_creates_admin_and_seeds_demo_data(): void
    {
        $this->artisan('rechrono:setup', [
            '--no-interaction' => true,
            '--name' => 'Local Admin',
            '--email' => 'admin@example.com',
            '--password' => 'secret-password',
            '--seed-demo' => true,
        ])->assertSuccessful();

        $this->assertDatabaseHas('users', [
            'email' => 'admin@example.com',
            'name' => 'Local Admin',
            'is_admin' => true,
        ]);

        $this->assertDatabaseHas('projects', ['name' => 'Default Planning Board']);
    }

    public function test_setup_command_can_skip_demo_data(): void
    {
        $this->artisan('rechrono:setup', [
            '--no-interaction' => true,
            '--name' => 'Local Admin',
            '--email' => 'admin@example.com',
            '--password' => 'secret-password',
            '--no-seed-demo' => true,
        ])->assertSuccessful();

        $this->assertSame(1, User::query()->count());
        $this->assertSame(0, Project::query()->count());
    }
}
