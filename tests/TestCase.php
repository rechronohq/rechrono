<?php

namespace Tests;

use App\Models\User;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function seedPlannerDemo(): User
    {
        $this->seed(DemoDataSeeder::class);

        return User::factory()->admin()->create();
    }
}
