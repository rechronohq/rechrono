<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\Task;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startDate = CarbonImmutable::instance(fake()->dateTimeBetween('now', '+2 weeks'))->startOfDay();
        $endDate = $startDate->addDays(fake()->numberBetween(1, 5));

        return [
            'project_id' => Project::factory(),
            'parent_id' => null,
            'sort_order' => 0,
            'name' => fake()->sentence(3),
            'description' => fake()->optional()->sentence(10),
            'start_date' => $startDate,
            'end_date' => $endDate,
            'progress' => fake()->numberBetween(0, 95),
            'dependency_id' => null,
            'assignee_user_id' => null,
            'completed' => false,
        ];
    }
}
