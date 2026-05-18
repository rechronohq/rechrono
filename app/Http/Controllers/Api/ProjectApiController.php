<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\StoreProjectRequest;
use App\Http\Requests\Projects\UpdateProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use App\Models\Team;
use App\Services\ProjectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProjectApiController extends Controller
{
    public function __construct(
        protected ProjectService $projectService,
    ) {}

    public function index(Team $team): AnonymousResourceCollection
    {
        return ProjectResource::collection(
            $team->projects()
                ->timelineVisible()
                ->orderBy('name')
                ->get(),
        );
    }

    public function store(StoreProjectRequest $request, Team $team): JsonResponse
    {
        $project = $this->projectService->create($team, $request->validated());

        return ProjectResource::make($project)->response()->setStatusCode(201);
    }

    public function show(Team $team, Project $project): ProjectResource
    {
        return ProjectResource::make(
            $project->load([
                'tasks' => fn ($query) => $query
                    ->orderBy('sort_order')
                    ->orderBy('start_date')
                    ->orderBy('name'),
            ]),
        );
    }

    public function update(UpdateProjectRequest $request, Team $team, Project $project): ProjectResource
    {
        return ProjectResource::make(
            $this->projectService->update($team, $project, $request->validated()),
        );
    }

    public function destroy(Team $team, Project $project): JsonResponse
    {
        $this->projectService->deleteTrees($team, [$project->id]);

        return response()->json(null, 204);
    }
}
