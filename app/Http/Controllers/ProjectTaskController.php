<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Services\ProjectTaskService;
use App\Support\TimelinePayloadBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProjectTaskController extends Controller
{
    public function __construct(
        protected TimelinePayloadBuilder $timelinePayloadBuilder,
        protected ProjectTaskService $projectTaskService,
    ) {}

    public function store(Request $request, Team $team, Project $project): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'kind' => ['nullable', 'string', 'in:task,group'],
            'parent_id' => ['nullable', 'uuid', 'exists:tasks,id'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'dependency_id' => ['nullable', 'uuid', 'exists:tasks,id'],
            'assignee_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ])->validate();

        $this->projectTaskService->create($team, $project, $validated);

        return response()->json($this->timelinePayload($request, $project));
    }

    public function update(Request $request, Team $team, Project $project, Task $task): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'kind' => ['sometimes', 'string', 'in:task,group'],
            'project_id' => ['sometimes', 'uuid', 'exists:projects,id'],
            'parent_id' => ['sometimes', 'nullable', 'uuid', 'exists:tasks,id'],
            'start_date' => ['sometimes', 'date'],
            'end_date' => ['sometimes', 'date', 'after_or_equal:start_date'],
            'progress' => ['sometimes', 'integer', 'between:0,100'],
            'completed' => ['sometimes', 'boolean'],
            'interaction' => ['sometimes', 'string', 'in:move,resize_left,resize_right,dependency_set,dependency_clear'],
            'dependency_id' => ['sometimes', 'nullable', 'uuid', 'exists:tasks,id'],
            'assignee_user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ])->validate();

        $targetProject = $this->projectTaskService->update($team, $project, $task, $validated);

        return response()->json($this->timelinePayload($request, $targetProject));
    }

    public function reorder(Request $request, Team $team, Project $project): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'task_id' => ['required', 'uuid', 'exists:tasks,id'],
            'target_task_id' => ['required', 'uuid', 'exists:tasks,id'],
            'position' => ['required', 'string', 'in:before,after,into'],
        ])->validate();

        $this->projectTaskService->reorder($project, $validated);

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
