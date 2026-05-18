<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProjectTasks\ReorderProjectTaskRequest;
use App\Http\Requests\ProjectTasks\StoreProjectTaskRequest;
use App\Http\Requests\ProjectTasks\UpdateProjectTaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Services\ProjectTaskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProjectTaskApiController extends Controller
{
    public function __construct(
        protected ProjectTaskService $projectTaskService,
    ) {}

    public function store(StoreProjectTaskRequest $request, Team $team, Project $project): JsonResponse
    {
        $task = $this->projectTaskService->create($team, $project, $request->validated());

        return TaskResource::make($task->fresh())->response()->setStatusCode(201);
    }

    public function update(UpdateProjectTaskRequest $request, Team $team, Project $project, Task $task): TaskResource
    {
        $this->projectTaskService->update($team, $project, $task, $request->validated());

        return TaskResource::make($task->fresh());
    }

    public function duplicate(Team $team, Project $project, Task $task): JsonResponse
    {
        $taskCopy = $this->projectTaskService->duplicate($project, $task);

        return TaskResource::make($taskCopy)->response()->setStatusCode(201);
    }

    public function reorder(ReorderProjectTaskRequest $request, Team $team, Project $project): AnonymousResourceCollection
    {
        $this->projectTaskService->reorder($project, $request->validated());

        return TaskResource::collection(
            $project->tasks()
                ->whereNull('parent_id')
                ->orderBy('sort_order')
                ->orderBy('start_date')
                ->orderBy('name')
                ->get(),
        );
    }

    public function destroy(Team $team, Project $project, Task $task): JsonResponse
    {
        $this->projectTaskService->delete($project, $task);

        return response()->json(null, 204);
    }
}
