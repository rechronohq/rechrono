<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Support\TimelinePayloadBuilder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class TimelinePageController extends Controller
{
    public function __construct(
        protected TimelinePayloadBuilder $timelinePayloadBuilder,
    ) {}

    public function __invoke(Request $request, ?Project $project = null): Response
    {
        $allProjects = Project::query()->timelineVisible()->get();
        $selectedProjectIds = $this->selectedProjectIds($request, $allProjects, $project);
        $visibleProjectIds = $this->visibleProjectIds($allProjects, $selectedProjectIds, $project);
        $selectedAssigneeFilters = $this->selectedAssigneeFilters($request);
        $showWeekends = $this->showWeekends($request);
        $collapsedProjectIds = $this->collapsedProjectIds($request, $allProjects);
        $selectedProjects = $allProjects
            ->whereIn('id', $visibleProjectIds)
            ->values();

        return Inertia::render('Tasks/Index', [
            'timelineData' => $this->timelinePayloadBuilder->build($selectedProjects, $allProjects, $selectedProjectIds, $selectedAssigneeFilters, $showWeekends, $collapsedProjectIds),
            'createTaskUrlTemplate' => route('projects.tasks.store', ['project' => '__PROJECT__']),
            'duplicateTaskUrlTemplate' => route('projects.tasks.duplicate', ['project' => '__PROJECT__', 'task' => '__TASK__']),
            'reorderTaskUrlTemplate' => route('projects.tasks.reorder', ['project' => '__PROJECT__']),
            'updateTaskUrlTemplate' => route('projects.tasks.update', ['project' => '__PROJECT__', 'task' => '__TASK__']),
        ]);
    }

    protected function selectedProjectIds(Request $request, Collection $allProjects, ?Project $project = null): array
    {
        $requestedIds = collect($request->query('projects', []))
            ->filter(fn (mixed $value): bool => is_string($value) && $value !== '')
            ->values();

        if ($requestedIds->isNotEmpty()) {
            return $allProjects
                ->pluck('id')
                ->intersect($requestedIds)
                ->values()
                ->all();
        }

        if ($project !== null) {
            return [$project->id];
        }

        return $allProjects->pluck('id')->all();
    }

    protected function visibleProjectIds(Collection $allProjects, array $selectedProjectIds, ?Project $project = null): array
    {
        if ($project && $project->parent_id !== null && $selectedProjectIds === [$project->id]) {
            return [$project->id];
        }

        $expanded = Project::expandSelectedIds($allProjects, $selectedProjectIds);

        return $expanded !== [] ? $expanded : $allProjects->pluck('id')->all();
    }

    protected function selectedAssigneeFilters(Request $request): array
    {
        return collect($request->query('assignees', []))
            ->filter(fn (mixed $value): bool => is_string($value) && $value !== '')
            ->values()
            ->all();
    }

    protected function showWeekends(Request $request): bool
    {
        return $request->boolean('show_weekends', false);
    }

    protected function collapsedProjectIds(Request $request, Collection $allProjects): array
    {
        return collect($request->query('collapsed', []))
            ->filter(fn (mixed $value): bool => is_string($value) && $value !== '')
            ->intersect($allProjects->pluck('id'))
            ->values()
            ->all();
    }
}
