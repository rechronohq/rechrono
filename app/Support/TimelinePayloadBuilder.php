<?php

namespace App\Support;

use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TimelinePayloadBuilder
{
    public function build(
        Collection $selectedProjects,
        Collection $allProjects,
        array $selectedProjectIds,
        array $selectedAssigneeFilters = [],
        bool $showWeekends = false,
        array $collapsedProjectIds = [],
        ?string $timelineDensity = null,
        ?Team $team = null,
    ): array {
        $team ??= $allProjects->first()?->team;
        $selectedProjects = Project::orderedHierarchy($selectedProjects);
        $allProjects = Project::orderedHierarchy($allProjects);
        $templateProjects = Project::orderedHierarchy(
            ($team ? $team->projects() : Project::query())->templates()->get()
        )->whereNull('parent_id')->values();
        $collapsedProjectIds = collect($collapsedProjectIds)
            ->filter(fn (mixed $value): bool => is_string($value) && $value !== '')
            ->intersect($allProjects->pluck('id'))
            ->values()
            ->all();

        $assigneeOptions = [
            [
                'value' => null,
                'type' => null,
                'user_id' => null,
                'filter_value' => 'unassigned',
                'label' => 'Unassigned',
            ],
            ...($team ? $team->users() : User::query())
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (User $user): array => [
                    'value' => $user->id,
                    'type' => 'user',
                    'user_id' => $user->id,
                    'filter_value' => sprintf('user:%s', $user->id),
                    'label' => $user->name,
                ])
                ->all(),
        ];

        $allAssigneeFilters = collect($assigneeOptions)
            ->pluck('filter_value')
            ->filter()
            ->values();
        $selectedAssigneeFilters = collect($selectedAssigneeFilters)
            ->filter(fn (mixed $value): bool => is_string($value) && $value !== '')
            ->intersect($allAssigneeFilters)
            ->values();

        if ($selectedAssigneeFilters->isEmpty()) {
            $selectedAssigneeFilters = $allAssigneeFilters;
        }

        $tasks = Task::query()
            ->with(['project', 'dependency', 'assigneeUser'])
            ->whereIn('project_id', $selectedProjects->pluck('id'))
            ->orderBy('sort_order')
            ->orderBy('start_date')
            ->orderBy('name')
            ->get();

        $tasks = $this->filterTasksByAssignee($tasks, $selectedAssigneeFilters);
        $projectActualSeconds = $team?->time_tracking_enabled
            ? DB::table('time_entries')
                ->select('project_id', DB::raw('sum(duration_seconds) as seconds'))
                ->where('team_id', $team->id)
                ->whereNotNull('ended_at')
                ->groupBy('project_id')
                ->pluck('seconds', 'project_id')
            : collect();

        $childrenByParent = $tasks->groupBy('parent_id');
        $items = $this->flatten($childrenByParent, $tasks);
        [$rangeStart, $rangeEnd] = $this->dateRange($tasks);

        return [
            'projects' => $allProjects->map(function (Project $project) use ($selectedProjectIds, $team, $projectActualSeconds): array {
                $routeTeam = $team ?? $project->team;
                $actualSeconds = (int) ($projectActualSeconds[$project->id] ?? 0);

                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'description' => $project->description,
                    'is_active' => $project->is_active,
                    'is_template' => $project->is_template,
                    'budget_hours' => $team?->time_tracking_enabled ? ($project->budget_hours === null ? null : (float) $project->budget_hours) : null,
                    'actual_hours' => $team?->time_tracking_enabled ? round($actualSeconds / 3600, 2) : null,
                    'parent_id' => $project->parent_id,
                    'depth' => $project->parent_id ? 1 : 0,
                    'selected' => in_array($project->id, $selectedProjectIds, true),
                    'destroy_url' => route('projects.destroy', [$routeTeam, $project]),
                    'duplicate_url' => route('projects.duplicate', [$routeTeam, $project]),
                    'edit_url' => route('projects.edit', [$routeTeam, $project]),
                    'show_url' => route('projects.show', [$routeTeam, $project]),
                    'template_url' => route('projects.template', [$routeTeam, $project]),
                    'timeline_url' => route('projects.timeline', [$routeTeam, $project]),
                ];
            })->all(),
            'template_projects' => $templateProjects->map(fn (Project $project): array => [
                'id' => $project->id,
                'name' => $project->name,
            ])->all(),
            'selected_project_ids' => array_values($selectedProjectIds),
            'visible_project_ids' => $selectedProjects->pluck('id')->values()->all(),
            'collapsed_project_ids' => $collapsedProjectIds,
            'assignee_options' => $assigneeOptions,
            'selected_assignee_filters' => $selectedAssigneeFilters->all(),
            'show_weekends' => $showWeekends,
            'timeline_density' => $timelineDensity,
            'items' => $items,
            'range_start' => $rangeStart,
            'range_end' => $rangeEnd,
            'max_depth' => 2,
        ];
    }

    protected function flatten(Collection $childrenByParent, Collection $allTasks, ?string $parentId = null, int $depth = 0): array
    {
        $items = [];

        foreach ($childrenByParent->get($parentId, collect()) as $task) {
            $items[] = $task->toTimelinePayload($depth, $allTasks);
            $items = [
                ...$items,
                ...$this->flatten($childrenByParent, $allTasks, $task->id, $depth + 1),
            ];
        }

        return $items;
    }

    protected function dateRange(Collection $tasks): array
    {
        $datedTasks = $tasks->filter(
            fn (Task $task): bool => $task->start_date !== null && $task->end_date !== null,
        );

        if ($datedTasks->isEmpty()) {
            $today = CarbonImmutable::today();

            return [
                $today->startOfMonth()->subWeek()->toDateString(),
                $today->addMonthsNoOverflow(3)->endOfMonth()->toDateString(),
            ];
        }

        $start = CarbonImmutable::parse($datedTasks->min('start_date'))
            ->startOfMonth()
            ->subWeek();
        $end = CarbonImmutable::parse($datedTasks->max('end_date'))
            ->addMonthsNoOverflow(2)
            ->endOfMonth();

        return [
            $start->toDateString(),
            $end->toDateString(),
        ];
    }

    protected function filterTasksByAssignee(Collection $tasks, Collection $selectedAssigneeFilters): Collection
    {
        $allTaskFilters = $tasks
            ->map(fn (Task $task): string => $this->taskAssigneeFilterValue($task))
            ->unique()
            ->values();

        if ($selectedAssigneeFilters->count() === 0 || $selectedAssigneeFilters->count() === $allTaskFilters->count()) {
            return $tasks;
        }

        $matchingTasks = $tasks->filter(
            fn (Task $task): bool => $selectedAssigneeFilters->contains($this->taskAssigneeFilterValue($task)),
        );

        if ($matchingTasks->isEmpty()) {
            return collect();
        }

        $tasksById = $tasks->keyBy('id');
        $visibleIds = $matchingTasks->pluck('id')->flip();

        foreach ($matchingTasks as $task) {
            $parentId = $task->parent_id;

            while ($parentId !== null && $tasksById->has($parentId)) {
                $visibleIds[$parentId] = true;
                $parentId = $tasksById[$parentId]->parent_id;
            }
        }

        return $tasks->filter(fn (Task $task): bool => $visibleIds->has($task->id))->values();
    }

    protected function taskAssigneeFilterValue(Task $task): string
    {
        return $task->assignee_user_id === null ? 'unassigned' : sprintf('user:%s', $task->assignee_user_id);
    }
}
