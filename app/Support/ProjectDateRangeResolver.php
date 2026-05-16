<?php

namespace App\Support;

use App\Models\Project;
use App\Models\Task;
use Illuminate\Support\Collection;

class ProjectDateRangeResolver
{
    public function forCollection(Collection $projects): Collection
    {
        if ($projects->isEmpty()) {
            return collect();
        }

        $tasks = Task::query()
            ->whereIn('project_id', $projects->pluck('id'))
            ->get(['project_id', 'start_date', 'end_date']);
        $childrenByParent = $projects->whereNotNull('parent_id')->groupBy('parent_id');
        $tasksByProject = $tasks->groupBy('project_id');

        return $projects->mapWithKeys(function (Project $project) use ($childrenByParent, $tasksByProject): array {
            return [
                $project->id => $this->derivedDateRange($project, $childrenByParent, $tasksByProject),
            ];
        });
    }

    public function forProject(Project $project): array
    {
        $projects = collect([$project])->merge($project->children)->values();

        return $this->forCollection($projects)->get($project->id, [null, null]);
    }

    protected function derivedDateRange(Project $project, Collection $childrenByParent, Collection $tasksByProject): array
    {
        $projectIds = collect([$project->id])
            ->merge($childrenByParent->get($project->id, collect())->pluck('id'))
            ->values();

        $tasks = collect($tasksByProject->all())
            ->only($projectIds->all())
            ->flatten(1)
            ->filter(fn (Task $task): bool => $task->start_date !== null && $task->end_date !== null)
            ->values();

        if ($tasks->isEmpty()) {
            return [null, null];
        }

        return [
            $tasks->min('start_date')?->toDateString(),
            $tasks->max('end_date')?->toDateString(),
        ];
    }
}
