<?php

namespace Database\Factories;

use App\Models\Team;
use App\Models\TimelineView;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TimelineView>
 */
class TimelineViewFactory extends Factory
{
    public function definition(): array
    {
        return [
            'team_id' => Team::query()->value('id') ?? Team::factory(),
            'user_id' => User::factory(),
            'name' => fake()->words(2, true),
            'project_ids' => [],
            'assignee_filters' => [],
            'show_weekends' => false,
            'timeline_density' => 'comfortable',
            'collapsed_project_ids' => [],
        ];
    }
}
