<?php

namespace App\Support;

use App\Models\Project;
use App\Models\Team;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ProjectsTablePayloadBuilder
{
    public function __construct(
        protected ProjectDateRangeResolver $projectDateRangeResolver,
    ) {}

    public function build(Collection $projects, string $statusFilter = 'active', ?Team $team = null): array
    {
        $team ??= $projects->first()?->team;
        $projects = Project::orderedHierarchy($projects);
        $dateRanges = $this->projectDateRangeResolver->forCollection($projects);
        $projectActualSeconds = $team?->time_tracking_enabled
            ? DB::table('time_entries')
                ->select('project_id', DB::raw('sum(duration_seconds) as seconds'))
                ->where('team_id', $team->id)
                ->whereNotNull('ended_at')
                ->groupBy('project_id')
                ->pluck('seconds', 'project_id')
            : collect();

        return [
            'status_filter' => $statusFilter,
            'status_options' => [
                ['value' => 'active', 'label' => 'Active'],
                ['value' => 'archived', 'label' => 'Archived'],
                ['value' => 'templates', 'label' => 'Templates'],
                ['value' => 'all', 'label' => 'All'],
            ],
            'bulk_action_url' => $team ? route('projects.bulk-action', $team) : null,
            'parent_options' => $projects
                ->filter(fn (Project $project): bool => $project->parent_id === null && ! $project->is_template)
                ->map(fn (Project $project): array => [
                    'id' => $project->id,
                    'name' => $project->name,
                ])
                ->values()
                ->all(),
            'rows' => $projects->map(function (Project $project) use ($dateRanges, $team, $projectActualSeconds): array {
                $routeTeam = $team ?? $project->team;
                [$startDate, $endDate] = $dateRanges->get($project->id, [null, null]);
                $actualSeconds = (int) ($projectActualSeconds[$project->id] ?? 0);
                $client = $project->effectiveClient();

                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'parent_id' => $project->parent_id,
                    'client_id' => $client?->id,
                    'client' => $client ? ['id' => $client->id, 'name' => $client->name] : null,
                    'budget_hours' => $team?->time_tracking_enabled ? ($project->budget_hours === null ? null : (float) $project->budget_hours) : null,
                    'actual_hours' => $team?->time_tracking_enabled ? round($actualSeconds / 3600, 2) : null,
                    'depth' => $project->parent_id ? 1 : 0,
                    'is_active' => $project->is_active,
                    'is_template' => $project->is_template,
                    'destroy_url' => route('projects.destroy', [$routeTeam, $project]),
                    'duplicate_url' => route('projects.duplicate', [$routeTeam, $project]),
                    'edit_url' => route('projects.edit', [$routeTeam, $project]),
                    'show_url' => route('projects.show', [$routeTeam, $project]),
                    'template_url' => route('projects.template', [$routeTeam, $project]),
                    'timeline_url' => route('projects.timeline', [$routeTeam, $project]),
                ];
            })->values()->all(),
        ];
    }
}
