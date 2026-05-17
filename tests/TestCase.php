<?php

namespace Tests;

use App\Models\User;
use App\Models\Team;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function seedPlannerDemo(): User
    {
        $team = Team::factory()->create(['slug' => 'demo-team']);
        $user = User::factory()->for($team)->admin()->create();

        $team->update(['owner_user_id' => $user->id]);

        $this->seed(DemoDataSeeder::class);

        return $user;
    }
}
