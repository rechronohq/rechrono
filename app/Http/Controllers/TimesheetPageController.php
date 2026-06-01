<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\Team;
use App\Models\TimeEntry;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TimesheetPageController extends Controller
{
    public function __invoke(Request $request, Team $team): Response
    {
        abort_unless($team->time_tracking_enabled, 404);

        $weekStart = CarbonImmutable::parse($request->query('week', now()->toDateString()))->startOfWeek();
        $weekEnd = $weekStart->addDays(6)->endOfDay();
        $user = $request->user();
        $canViewTeam = $team->owner_user_id === $user->id;
        $days = collect(range(0, 6))
            ->map(fn (int $offset): string => $weekStart->addDays($offset)->toDateString())
            ->all();

        $entries = TimeEntry::query()
            ->with(['project', 'task', 'user'])
            ->where('team_id', $team->id)
            ->whereBetween('started_at', [$weekStart, $weekEnd])
            ->whereNotNull('ended_at')
            ->when(! $canViewTeam, fn ($query) => $query->where('user_id', $user->id))
            ->orderBy('started_at')
            ->get();

        $rows = $entries
            ->groupBy(fn (TimeEntry $entry): string => "{$entry->user_id}:{$entry->task_id}")
            ->map(function ($rowEntries) use ($days): array {
                /** @var TimeEntry $first */
                $first = $rowEntries->first();
                $cells = collect($days)->mapWithKeys(fn (string $day): array => [$day => [
                    'entry_id' => null,
                    'hours' => 0.0,
                    'notes' => '',
                ]])->all();

                foreach ($rowEntries->groupBy(fn (TimeEntry $entry): string => $entry->started_at->toDateString()) as $day => $dayEntries) {
                    $seconds = $dayEntries->sum('duration_seconds');
                    /** @var TimeEntry $dayFirst */
                    $dayFirst = $dayEntries->first();

                    $cells[$day] = [
                        'entry_id' => $dayFirst->id,
                        'hours' => round($seconds / 3600, 2),
                        'notes' => $dayFirst->notes ?? '',
                    ];
                }

                return [
                    'key' => "{$first->user_id}:{$first->task_id}",
                    'user_id' => $first->user_id,
                    'user_name' => $first->user?->name,
                    'project_id' => $first->project_id,
                    'project_name' => $first->project?->name,
                    'task_id' => $first->task_id,
                    'task_name' => $first->task?->name,
                    'entries' => $cells,
                    'total_hours' => round($rowEntries->sum('duration_seconds') / 3600, 2),
                ];
            })
            ->sortBy([['project_name', 'asc'], ['task_name', 'asc'], ['user_name', 'asc']])
            ->values()
            ->all();

        $dayTotals = collect($days)->mapWithKeys(function (string $day) use ($entries): array {
            $seconds = $entries
                ->filter(fn (TimeEntry $entry): bool => $entry->started_at->toDateString() === $day)
                ->sum('duration_seconds');

            return [$day => round($seconds / 3600, 2)];
        })->all();

        return Inertia::render('Timesheet/Index', [
            'timesheet' => [
                'week_start' => $weekStart->toDateString(),
                'previous_week_url' => route('timesheet.index', [$team, 'week' => $weekStart->subWeek()->toDateString()]),
                'next_week_url' => route('timesheet.index', [$team, 'week' => $weekStart->addWeek()->toDateString()]),
                'days' => $days,
                'rows' => $rows,
                'totals' => [
                    'days' => $dayTotals,
                    'total_hours' => round($entries->sum('duration_seconds') / 3600, 2),
                ],
                'can_view_team' => $canViewTeam,
                'task_options' => $this->taskOptions($team),
                'routes' => [
                    'store' => route('time.entries.store', $team),
                    'update' => route('time.entries.update', [$team, '__ENTRY__']),
                    'destroy' => route('time.entries.destroy', [$team, '__ENTRY__']),
                ],
            ],
        ]);
    }

    protected function taskOptions(Team $team): array
    {
        return Task::query()
            ->with('project')
            ->whereHas('project', fn ($query) => $query->where('team_id', $team->id)->where('is_template', false))
            ->where('kind', Task::KIND_TASK)
            ->orderBy('name')
            ->get()
            ->map(fn (Task $task): array => [
                'id' => $task->id,
                'name' => $task->name,
                'project_id' => $task->project_id,
                'project_name' => $task->project?->name,
            ])
            ->all();
    }
}
