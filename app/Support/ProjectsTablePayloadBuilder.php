<?php

namespace App\Support;

use App\Models\Project;
use Illuminate\Support\Collection;

class ProjectsTablePayloadBuilder
{
    public function __construct(
        protected ProjectDateRangeResolver $projectDateRangeResolver,
    ) {}

    public function build(Collection $projects, string $statusFilter = 'active'): array
    {
        $projects = Project::orderedHierarchy($projects);
        $dateRanges = $this->projectDateRangeResolver->forCollection($projects);

        return [
            'status_filter' => $statusFilter,
            'status_options' => [
                ['value' => 'active', 'label' => 'Active'],
                ['value' => 'archived', 'label' => 'Archived'],
                ['value' => 'templates', 'label' => 'Templates'],
                ['value' => 'all', 'label' => 'All'],
            ],
            'bulk_action_url' => route('projects.bulk-action'),
            'parent_options' => $projects
                ->filter(fn (Project $project): bool => $project->parent_id === null && ! $project->is_template)
                ->map(fn (Project $project): array => [
                    'id' => $project->id,
                    'name' => $project->name,
                ])
                ->values()
                ->all(),
            'rows' => $projects->map(function (Project $project) use ($dateRanges): array {
                [$startDate, $endDate] = $dateRanges->get($project->id, [null, null]);

                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'parent_id' => $project->parent_id,
                    'depth' => $project->parent_id ? 1 : 0,
                    'is_active' => $project->is_active,
                    'is_template' => $project->is_template,
                    'destroy_url' => route('projects.destroy', $project),
                    'duplicate_url' => route('projects.duplicate', $project),
                    'edit_url' => route('projects.edit', $project),
                    'show_url' => route('projects.show', $project),
                    'template_url' => route('projects.template', $project),
                    'timeline_url' => route('projects.timeline', $project),
                ];
            })->values()->all(),
        ];
    }
}
