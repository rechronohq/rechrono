<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Team;
use App\Models\TimelineView;
use App\Support\TimelinePayloadBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class TimelineViewController extends Controller
{
    public function __construct(
        protected TimelinePayloadBuilder $timelinePayloadBuilder,
    ) {}

    public function show(Request $request, Team $team, TimelineView $timelineView): Response
    {
        $this->abortUnlessOwner($request, $timelineView);

        $allProjects = $team->projects()->with(['client', 'parent.client'])->timelineVisible()->get();
        $selectedProjectIds = $this->normalizeProjectIds($allProjects, $timelineView->project_ids ?? []);
        $visibleProjectIds = Project::expandSelectedIds($allProjects, $selectedProjectIds);
        $selectedProjects = $allProjects->whereIn('id', $visibleProjectIds)->values();

        return Inertia::render('Tasks/Index', [
            'timelineData' => $this->timelinePayloadBuilder->build(
                $selectedProjects,
                $allProjects,
                $selectedProjectIds,
                $timelineView->assignee_filters ?? [],
                $timelineView->show_weekends,
                $timelineView->collapsed_project_ids ?? [],
                $timelineView->timeline_density,
                $team,
            ),
            'activeTimelineViewId' => $timelineView->id,
            'createTaskUrlTemplate' => route('projects.tasks.store', ['team' => $team, 'project' => '__PROJECT__']),
            'duplicateTaskUrlTemplate' => route('projects.tasks.duplicate', ['team' => $team, 'project' => '__PROJECT__', 'task' => '__TASK__']),
            'reorderTaskUrlTemplate' => route('projects.tasks.reorder', ['team' => $team, 'project' => '__PROJECT__']),
            'updateTaskUrlTemplate' => route('projects.tasks.update', ['team' => $team, 'project' => '__PROJECT__', 'task' => '__TASK__']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $team = $this->currentTeam($request);
        $validated = $this->validatedPayload($request, includeSettings: true);

        $timelineView = $request->user()->timelineViews()->create([
            ...$validated,
            'team_id' => $team->id,
        ]);

        return response()->json([
            'view' => $this->viewPayload($timelineView),
        ], 201);
    }

    public function update(Request $request, Team $team, TimelineView $timelineView): JsonResponse
    {
        $this->abortUnlessOwner($request, $timelineView);

        $validated = $this->validatedUpdatePayload($request);

        $timelineView->update($validated);

        return response()->json([
            'view' => $this->viewPayload($timelineView->fresh()),
        ]);
    }

    public function destroy(Request $request, Team $team, TimelineView $timelineView): JsonResponse
    {
        $this->abortUnlessOwner($request, $timelineView);

        $timelineView->delete();

        return response()->json(['ok' => true]);
    }

    protected function validatedPayload(Request $request, bool $includeSettings): array
    {
        $rules = [
            'name' => ['required', 'string', 'max:80'],
        ];

        if ($includeSettings) {
            $rules = [
                ...$rules,
                'project_ids' => ['present', 'array'],
                'project_ids.*' => ['string'],
                'assignee_filters' => ['present', 'array'],
                'assignee_filters.*' => ['string'],
                'show_weekends' => ['required', 'boolean'],
                'timeline_density' => ['required', 'in:comfortable,compact'],
                'collapsed_project_ids' => ['present', 'array'],
                'collapsed_project_ids.*' => ['string'],
            ];
        }

        return $request->validate($rules);
    }

    protected function validatedUpdatePayload(Request $request): array
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:80'],
            'project_ids' => ['sometimes', 'array'],
            'project_ids.*' => ['string'],
            'assignee_filters' => ['sometimes', 'array'],
            'assignee_filters.*' => ['string'],
            'show_weekends' => ['sometimes', 'boolean'],
            'timeline_density' => ['sometimes', 'in:comfortable,compact'],
            'collapsed_project_ids' => ['sometimes', 'array'],
            'collapsed_project_ids.*' => ['string'],
        ]);

        abort_if($validated === [], 422, 'At least one timeline view field is required.');

        return $validated;
    }

    protected function normalizeProjectIds(Collection $allProjects, array $projectIds): array
    {
        $selectedProjectIds = $allProjects
            ->pluck('id')
            ->intersect($projectIds)
            ->values()
            ->all();

        return $selectedProjectIds !== [] ? $selectedProjectIds : $allProjects->pluck('id')->all();
    }

    protected function abortUnlessOwner(Request $request, TimelineView $timelineView): void
    {
        abort_unless($timelineView->user_id === $request->user()?->id, 404);
    }

    protected function viewPayload(TimelineView $timelineView): array
    {
        $team = $timelineView->team;

        return [
            'id' => $timelineView->id,
            'name' => $timelineView->name,
            'url' => route('timeline-views.show', [$team, $timelineView]),
            'update_url' => route('timeline-views.update', [$team, $timelineView]),
            'delete_url' => route('timeline-views.destroy', [$team, $timelineView]),
        ];
    }

    protected function currentTeam(Request $request): Team
    {
        /** @var Team $team */
        $team = $request->route('team');

        return $team;
    }
}
