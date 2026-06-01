<?php

namespace App\Services;

use App\Models\Task;
use App\Models\Team;
use App\Models\TimeEntry;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class TimeTrackingService
{
    public function currentTimer(Team $team, User $user): ?TimeEntry
    {
        return TimeEntry::query()
            ->with(['project', 'task', 'user'])
            ->where('team_id', $team->id)
            ->where('user_id', $user->id)
            ->whereNull('ended_at')
            ->latest('started_at')
            ->first();
    }

    public function startTimer(Team $team, User $user, Task $task, ?CarbonInterface $now = null): TimeEntry
    {
        abort_unless($team->time_tracking_enabled, 404);
        $task->loadMissing('project');
        abort_unless($task->project?->team_id === $team->id && $task->isTask(), 404);

        $now ??= now();

        return DB::transaction(function () use ($team, $user, $task, $now): TimeEntry {
            $this->stopCurrentTimer($team, $user, $now);

            return TimeEntry::query()->create([
                'team_id' => $team->id,
                'project_id' => $task->project_id,
                'task_id' => $task->id,
                'user_id' => $user->id,
                'started_at' => $now,
                'ended_at' => null,
                'duration_seconds' => 0,
            ])->fresh(['project', 'task', 'user']);
        });
    }

    public function stopCurrentTimer(Team $team, User $user, ?CarbonInterface $now = null): ?TimeEntry
    {
        abort_unless($team->time_tracking_enabled, 404);
        $now ??= now();

        $entry = $this->currentTimer($team, $user);

        if (! $entry) {
            return null;
        }

        $entry->forceFill([
            'ended_at' => $now,
            'duration_seconds' => max(0, (int) $entry->started_at->diffInSeconds($now)),
        ])->save();

        return $entry->fresh(['project', 'task', 'user']);
    }

    public function createManualEntry(Team $team, User $user, array $validated): TimeEntry
    {
        abort_unless($team->time_tracking_enabled, 404);
        $task = $this->teamTask($team, $validated['task_id']);
        $startedAt = CarbonImmutable::parse($validated['date'])->startOfDay();
        $durationSeconds = $this->secondsFromHours($validated['hours']);

        return TimeEntry::query()->create([
            'team_id' => $team->id,
            'project_id' => $task->project_id,
            'task_id' => $task->id,
            'user_id' => $user->id,
            'started_at' => $startedAt,
            'ended_at' => $startedAt->addSeconds($durationSeconds),
            'duration_seconds' => $durationSeconds,
            'notes' => $validated['notes'] ?? null,
        ])->fresh(['project', 'task', 'user']);
    }

    public function updateManualEntry(Team $team, User $user, TimeEntry $entry, array $validated): TimeEntry
    {
        abort_unless($team->time_tracking_enabled, 404);
        $this->authorizeEntryAccess($team, $user, $entry, mutate: true);
        $task = $this->teamTask($team, $validated['task_id']);
        $startedAt = CarbonImmutable::parse($validated['date'])->startOfDay();
        $durationSeconds = $this->secondsFromHours($validated['hours']);

        $entry->update([
            'project_id' => $task->project_id,
            'task_id' => $task->id,
            'started_at' => $startedAt,
            'ended_at' => $startedAt->addSeconds($durationSeconds),
            'duration_seconds' => $durationSeconds,
            'notes' => $validated['notes'] ?? null,
        ]);

        return $entry->fresh(['project', 'task', 'user']);
    }

    public function deleteManualEntry(Team $team, User $user, TimeEntry $entry): void
    {
        abort_unless($team->time_tracking_enabled, 404);
        $this->authorizeEntryAccess($team, $user, $entry, mutate: true);
        $entry->delete();
    }

    public function authorizeEntryAccess(Team $team, User $user, TimeEntry $entry, bool $mutate = false): void
    {
        abort_unless($entry->team_id === $team->id, 404);

        if ($mutate) {
            abort_unless($entry->user_id === $user->id, 404);

            return;
        }

        abort_unless($entry->user_id === $user->id || $team->owner_user_id === $user->id, 404);
    }

    protected function teamTask(Team $team, string $taskId): Task
    {
        /** @var Task $task */
        $task = Task::query()
            ->with('project')
            ->whereKey($taskId)
            ->whereHas('project', fn ($query) => $query->where('team_id', $team->id))
            ->firstOrFail();

        abort_unless($task->isTask(), 422, 'Time can only be tracked against tasks.');

        return $task;
    }

    protected function secondsFromHours(mixed $hours): int
    {
        return max(1, (int) round(((float) $hours) * 3600));
    }
}
