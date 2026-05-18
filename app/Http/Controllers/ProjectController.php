<?php

namespace App\Http\Controllers;

use App\Http\Requests\Projects\BulkProjectActionRequest;
use App\Http\Requests\Projects\StoreProjectFromTemplateRequest;
use App\Http\Requests\Projects\StoreProjectRequest;
use App\Http\Requests\Projects\UpdateProjectRequest;
use App\Models\Project;
use App\Models\Team;
use App\Services\ProjectService;
use App\Support\TimelinePayloadBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class ProjectController extends Controller
{
    public function __construct(
        protected TimelinePayloadBuilder $timelinePayloadBuilder,
        protected ProjectService $projectService,
    ) {}

    public function store(StoreProjectRequest $request): JsonResponse
    {
        $team = $this->currentTeam($request);
        $validated = $request->validated();

        $project = $this->projectService->create($team, $validated);
        $allProjects = $this->allVisibleProjects($team);
        $selectedProjectIds = collect($validated['selected_project_ids'] ?? [])
            ->push($project->id)
            ->unique()
            ->values()
            ->all();
        $visibleProjectIds = Project::expandSelectedIds($allProjects, $selectedProjectIds);
        $selectedProjects = $allProjects
            ->whereIn('id', $visibleProjectIds)
            ->values();

        return response()->json([
            ...$this->timelinePayload($request, $selectedProjects, $allProjects, $selectedProjectIds),
            'project' => [
                'id' => $project->id,
                'show_url' => route('projects.show', [$team, $project]),
            ],
        ]);
    }

    public function update(UpdateProjectRequest $request, Team $team, Project $project): JsonResponse
    {
        $project = $this->projectService->update($team, $project, $request->validated());

        return response()->json([
            ...$this->timelinePayloadForRequest($request, $project),
            'project' => [
                'id' => $project->id,
                'show_url' => route('projects.show', [$team, $project]),
            ],
        ]);
    }

    public function duplicate(Request $request, Team $team, Project $project): JsonResponse
    {
        $this->projectService->duplicate($project);

        return response()->json($this->timelinePayloadForRequest($request, $project->fresh()));
    }

    public function saveAsTemplate(Request $request, Team $team, Project $project): JsonResponse
    {
        $this->projectService->saveAsTemplate($team, $project);

        return response()->json($this->timelinePayloadForRequest($request, $project->fresh()));
    }

    public function storeFromTemplate(StoreProjectFromTemplateRequest $request): JsonResponse
    {
        $team = $this->currentTeam($request);
        $validated = $request->validated();

        $project = $this->projectService->createFromTemplate($team, $validated);
        $allProjects = $this->allVisibleProjects($team);
        $selectedProjectIds = collect($validated['selected_project_ids'] ?? [])
            ->push($project->id)
            ->unique()
            ->values()
            ->all();
        $visibleProjectIds = Project::expandSelectedIds($allProjects, $selectedProjectIds);
        $selectedProjects = $allProjects->whereIn('id', $visibleProjectIds)->values();

        return response()->json(
            [
                ...$this->timelinePayload($request, $selectedProjects, $allProjects, $selectedProjectIds),
                'project' => [
                    'id' => $project->id,
                    'show_url' => route('projects.show', [$team, $project]),
                ],
            ],
        );
    }

    public function destroy(Request $request, Team $team, Project $project): JsonResponse
    {
        $this->projectService->deleteTrees($team, [$project->id]);

        return response()->json($this->timelinePayloadForRequest($request));
    }

    public function bulkAction(BulkProjectActionRequest $request): JsonResponse
    {
        $team = $this->currentTeam($request);
        $this->projectService->bulkAction($team, $request->validated());

        return response()->json(['ok' => true]);
    }

    protected function timelinePayloadForRequest(Request $request, ?Project $fallbackProject = null): array
    {
        $team = $this->currentTeam($request);
        $allProjects = $this->allVisibleProjects($team);
        $selectedProjectIds = collect($request->input('selected_project_ids', []))
            ->filter(fn (mixed $value): bool => is_string($value) && $value !== '')
            ->intersect($allProjects->pluck('id'))
            ->values();

        if ($selectedProjectIds->isEmpty() && $fallbackProject) {
            $selectedProjectIds = collect([$fallbackProject->id]);
        }

        $visibleProjectIds = Project::expandSelectedIds($allProjects, $selectedProjectIds->all());
        $selectedProjects = $allProjects->whereIn('id', $visibleProjectIds)->values();

        if ($selectedProjects->isEmpty()) {
            $selectedProjects = $allProjects->take(min(1, $allProjects->count()))->values();
            $selectedProjectIds = $selectedProjects->pluck('id');
        }

        return $this->timelinePayload($request, $selectedProjects, $allProjects, $selectedProjectIds->all());
    }

    protected function timelinePayload(Request $request, Collection $selectedProjects, Collection $allProjects, array $selectedProjectIds): array
    {
        return $this->timelinePayloadBuilder->build(
            $selectedProjects,
            $allProjects,
            $selectedProjectIds,
            $request->input('selected_assignee_filters', []),
            $request->boolean('show_weekends', false),
            collect($request->input('collapsed_project_ids', []))
                ->filter(fn (mixed $value): bool => is_string($value) && $value !== '')
                ->all(),
            team: $this->currentTeam($request),
        );
    }

    protected function allVisibleProjects(Team $team): Collection
    {
        return $team->projects()
            ->timelineVisible()
            ->get();
    }

    protected function currentTeam(Request $request): Team
    {
        /** @var Team $team */
        $team = $request->route('team');

        return $team;
    }
}
