<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProjectTasks\ReorderProjectTaskRequest;
use App\Http\Requests\ProjectTasks\StoreProjectTaskRequest;
use App\Http\Requests\ProjectTasks\UpdateProjectTaskRequest;
use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Services\ProjectTaskService;
use App\Support\TimelinePayloadBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectTaskController extends Controller
{
    public function __construct(
        protected TimelinePayloadBuilder $timelinePayloadBuilder,
        protected ProjectTaskService $projectTaskService,
    ) {}

    public function store(StoreProjectTaskRequest $request, Team $team, Project $project): JsonResponse
    {
        $this->projectTaskService->create($team, $project, $request->validated());

        return response()->json($this->timelinePayload($request, $project));
    }

    public function update(UpdateProjectTaskRequest $request, Team $team, Project $project, Task $task): JsonResponse
    {
        $targetProject = $this->projectTaskService->update($team, $project, $task, $request->validated());

        return response()->json($this->timelinePayload($request, $targetProject));
    }

    public function reorder(ReorderProjectTaskRequest $request, Team $team, Project $project): JsonResponse
    {
        $this->projectTaskService->reorder($project, $request->validated());

        return response()->json($this->timelinePayload($request, $project));
    }

    public function duplicate(Request $request, Team $team, Project $project, Task $task): JsonResponse
    {
        $this->projectTaskService->duplicate($project, $task);

        return response()->json($this->timelinePayload($request, $project));
    }

    public function destroy(Request $request, Team $team, Project $project, Task $task): JsonResponse
    {
        $this->projectTaskService->delete($project, $task);

        return response()->json($this->timelinePayload($request, $project));
    }

    protected function timelinePayload(Request $request, Project $fallbackProject): array
    {
        $selectedProjectIds = collect($request->input('selected_project_ids', [$fallbackProject->id]))
            ->filter(fn (mixed $value): bool => is_string($value) && $value !== '')
            ->unique()
            ->values();
        $selectedAssigneeFilters = collect($request->input('selected_assignee_filters', []))
            ->filter(fn (mixed $value): bool => is_string($value) && $value !== '')
            ->unique()
            ->values();

        $team = $this->currentTeam($request);
        $allProjects = $team->projects()->timelineVisible()->orderBy('name')->get();
        $visibleProjectIds = Project::expandSelectedIds($allProjects, $selectedProjectIds->all());
        $selectedProjects = $allProjects
            ->whereIn('id', $visibleProjectIds)
            ->values();

        if ($selectedProjects->isEmpty()) {
            $selectedProjects = collect([$fallbackProject->fresh()]);
            $selectedProjectIds = collect([$fallbackProject->id]);
        }

        return $this->timelinePayloadBuilder->build(
            $selectedProjects,
            $allProjects,
            $selectedProjectIds->all(),
            $selectedAssigneeFilters->all(),
            $request->boolean('show_weekends', false),
            collect($request->input('collapsed_project_ids', []))
                ->filter(fn (mixed $value): bool => is_string($value) && $value !== '')
                ->all(),
            team: $team,
        );
    }

    protected function currentTeam(Request $request): Team
    {
        /** @var Team $team */
        $team = $request->route('team');

        return $team;
    }
}
