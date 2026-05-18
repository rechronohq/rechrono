<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Team;
use App\Services\ProjectService;
use App\Support\TimelinePayloadBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;

class ProjectController extends Controller
{
    public function __construct(
        protected TimelinePayloadBuilder $timelinePayloadBuilder,
        protected ProjectService $projectService,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $team = $this->currentTeam($request);
        $validated = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'parent_id' => ['nullable', 'uuid', 'exists:projects,id'],
            'selected_project_ids' => ['nullable', 'array'],
            'selected_project_ids.*' => ['uuid', 'exists:projects,id'],
            'selected_assignee_filters' => ['nullable', 'array'],
            'selected_assignee_filters.*' => ['string'],
            'show_weekends' => ['sometimes', 'boolean'],
        ])->validate();

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

    public function update(Request $request, Team $team, Project $project): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'parent_id' => ['nullable', 'uuid', 'exists:projects,id'],
            'selected_project_ids' => ['nullable', 'array'],
            'selected_project_ids.*' => ['uuid', 'exists:projects,id'],
            'selected_assignee_filters' => ['nullable', 'array'],
            'selected_assignee_filters.*' => ['string'],
            'show_weekends' => ['sometimes', 'boolean'],
        ])->validate();

        $project = $this->projectService->update($team, $project, $validated);

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

    public function storeFromTemplate(Request $request): JsonResponse
    {
        $team = $this->currentTeam($request);
        $validated = Validator::make($request->all(), [
            'template_project_id' => ['required', 'uuid', 'exists:projects,id'],
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'uuid', 'exists:projects,id'],
            'selected_project_ids' => ['nullable', 'array'],
            'selected_project_ids.*' => ['uuid', 'exists:projects,id'],
            'selected_assignee_filters' => ['nullable', 'array'],
            'selected_assignee_filters.*' => ['string'],
            'show_weekends' => ['sometimes', 'boolean'],
            'collapsed_project_ids' => ['nullable', 'array'],
            'collapsed_project_ids.*' => ['string'],
        ])->validate();

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

    public function bulkAction(Request $request): JsonResponse
    {
        $team = $this->currentTeam($request);
        $validated = $request->validate([
            'action' => ['required', 'in:archive,unarchive,change-parent,delete'],
            'project_ids' => ['required', 'array', 'min:1'],
            'project_ids.*' => ['uuid', 'exists:projects,id'],
            'parent_id' => ['nullable', 'uuid', 'exists:projects,id'],
        ]);

        $this->projectService->bulkAction($team, $validated);

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
