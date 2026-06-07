<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Team;
use App\Support\TimelinePayloadBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TimelineDataController extends Controller
{
    public function __construct(
        protected TimelinePayloadBuilder $timelinePayloadBuilder,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $team = $this->currentTeam($request);
        $allProjects = $team->projects()->with(['client', 'parent.client'])->timelineVisible()->get();
        $selectedProjectIds = collect($request->query('projects', []))
            ->filter(fn (mixed $value): bool => is_string($value) && $value !== '')
            ->values();
        $selectedAssigneeFilters = collect($request->query('assignees', []))
            ->filter(fn (mixed $value): bool => is_string($value) && $value !== '')
            ->values();
        $showWeekends = $request->boolean('show_weekends', false);
        $collapsedProjectIds = collect($request->query('collapsed', []))
            ->filter(fn (mixed $value): bool => is_string($value) && $value !== '')
            ->intersect($allProjects->pluck('id'))
            ->values();

        if ($selectedProjectIds->isEmpty()) {
            $selectedProjectIds = $allProjects->pluck('id');
        }

        $visibleProjectIds = Project::expandSelectedIds($allProjects, $selectedProjectIds->all());

        $selectedProjects = $allProjects
            ->whereIn('id', $visibleProjectIds)
            ->values();

        if ($selectedProjects->isEmpty()) {
            $selectedProjects = $allProjects;
            $selectedProjectIds = $allProjects->pluck('id');
        }

        return response()->json(
            $this->timelinePayloadBuilder->build(
                $selectedProjects,
                $allProjects,
                $selectedProjectIds->all(),
                $selectedAssigneeFilters->all(),
                $showWeekends,
                $collapsedProjectIds->all(),
                team: $team,
            ),
        );
    }

    protected function currentTeam(Request $request): Team
    {
        /** @var Team $team */
        $team = $request->route('team');

        return $team;
    }
}
