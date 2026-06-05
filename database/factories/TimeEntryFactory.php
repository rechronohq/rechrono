<?php

namespace Database\Factories;

use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TimeEntry>
 */
class TimeEntryFactory extends Factory
{
    public function definition(): array
    {
        $task = Task::factory()->create();
        $startedAt = CarbonImmutable::instance(fake()->dateTimeBetween('-1 week', 'now'))->minute(0)->second(0);
        $durationSeconds = fake()->numberBetween(1, 6) * 1800;

        return [
            'team_id' => $task->project->team_id,
            'project_id' => $task->project_id,
            'task_id' => $task->id,
            'user_id' => User::factory()->for($task->project->team),
            'started_at' => $startedAt,
            'ended_at' => $startedAt->addSeconds($durationSeconds),
            'duration_seconds' => $durationSeconds,
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
