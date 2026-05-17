<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'team_id' => Team::query()->value('id') ?? Team::factory(),
            'name' => fake()->words(3, true).' plan',
            'description' => fake()->sentence(12),
            'is_template' => false,
            'is_active' => true,
        ];
    }
}
