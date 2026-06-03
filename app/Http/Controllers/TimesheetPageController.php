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

        $view = $request->query('view') === 'week' ? 'week' : 'day';
        $selectedDate = CarbonImmutable::parse($request->query('date', $request->query('week', now()->toDateString())));
        $weekStart = CarbonImmutable::parse($request->query('week', $selectedDate->toDateString()))->startOfWeek();
        $weekEnd = $weekStart->addDays(6)->endOfDay();
        $dayStart = $selectedDate->startOfDay();
        $dayEnd = $selectedDate->endOfDay();
        $user = $request->user();
        $canViewTeam = $team->owner_user_id === $user->id;
        $days = collect(range(0, 6))
            ->map(fn (int $offset): string => $weekStart->addDays($offset)->toDateString())
            ->all();

        $entries = TimeEntry::query()
            ->with(['project', 'task', 'user'])
            ->where('team_id', $team->id)
            ->whereBetween('started_at', [$weekStart, $weekEnd])
            ->when(! $canViewTeam, fn ($query) => $query->where('user_id', $user->id))
            ->orderBy('started_at')
            ->get();

        $dayEntries = TimeEntry::query()
            ->with(['project', 'task', 'user'])
            ->where('team_id', $team->id)
            ->whereBetween('started_at', [$dayStart, $dayEnd])
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
                ]])->all();

                foreach ($rowEntries->groupBy(fn (TimeEntry $entry): string => $entry->started_at->toDateString()) as $day => $dayEntries) {
                    $seconds = $dayEntries->sum(fn (TimeEntry $entry): int => $entry->secondsAt());
                    /** @var TimeEntry $dayFirst */
                    $dayFirst = $dayEntries->first();

                    $cells[$day] = [
                        'entry_id' => $dayFirst->id,
                        'hours' => round($seconds / 3600, 2),
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
                    'total_hours' => round($rowEntries->sum(fn (TimeEntry $entry): int => $entry->secondsAt()) / 3600, 2),
                ];
            })
            ->sortBy([['project_name', 'asc'], ['task_name', 'asc'], ['user_name', 'asc']])
            ->values()
            ->all();

        $dayTotals = collect($days)->mapWithKeys(function (string $day) use ($entries): array {
            $seconds = $entries
                ->filter(fn (TimeEntry $entry): bool => $entry->started_at->toDateString() === $day)
                ->sum(fn (TimeEntry $entry): int => $entry->secondsAt());

            return [$day => round($seconds / 3600, 2)];
        })->all();

        return Inertia::render('Timesheet/Index', [
            'timesheet' => [
                'view' => $view,
                'week_start' => $weekStart->toDateString(),
                'selected_date' => $selectedDate->toDateString(),
                'previous_day_url' => route('timesheet.index', [$team, 'view' => 'day', 'date' => $selectedDate->subDay()->toDateString()]),
                'next_day_url' => route('timesheet.index', [$team, 'view' => 'day', 'date' => $selectedDate->addDay()->toDateString()]),
                'today_url' => route('timesheet.index', [$team, 'view' => 'day', 'date' => now()->toDateString()]),
                'day_url' => route('timesheet.index', [$team, 'view' => 'day', 'date' => '__DATE__']),
                'week_url' => route('timesheet.index', [$team, 'view' => 'week', 'week' => $weekStart->toDateString()]),
                'previous_week_url' => route('timesheet.index', [$team, 'view' => 'week', 'week' => $weekStart->subWeek()->toDateString()]),
                'next_week_url' => route('timesheet.index', [$team, 'view' => 'week', 'week' => $weekStart->addWeek()->toDateString()]),
                'days' => $days,
                'day_entries' => $dayEntries
                    ->map(fn (TimeEntry $entry): array => [
                        ...$entry->toPayload(),
                        'can_edit' => $entry->user_id === $user->id,
                    ])
                    ->all(),
                'rows' => $rows,
                'totals' => [
                    'days' => $dayTotals,
                    'day_hours' => round($dayEntries->sum(fn (TimeEntry $entry): int => $entry->secondsAt()) / 3600, 2),
                    'total_hours' => round($entries->sum(fn (TimeEntry $entry): int => $entry->secondsAt()) / 3600, 2),
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
