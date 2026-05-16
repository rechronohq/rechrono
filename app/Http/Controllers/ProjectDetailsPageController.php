<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Support\ProjectDateRangeResolver;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class ProjectDetailsPageController extends Controller
{
    public function __construct(
        protected ProjectDateRangeResolver $projectDateRangeResolver,
    ) {}

    public function __invoke(Project $project): Response
    {
        [$startDate, $endDate] = $this->projectDateRangeResolver->forProject($project);
        $tasks = $project->tasks()
            ->with(['assigneeUser', 'parent'])
            ->get();

        return Inertia::render('Projects/Show', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'is_active' => $project->is_active,
                'is_template' => $project->is_template,
                'bulk_action_url' => route('projects.bulk-action'),
                'parent' => $project->parent ? [
                    'id' => $project->parent->id,
                    'name' => $project->parent->name,
                ] : null,
                'destroy_url' => route('projects.destroy', $project),
                'duplicate_url' => route('projects.duplicate', $project),
                'edit_url' => route('projects.edit', $project),
                'show_url' => route('projects.show', $project),
                'template_url' => route('projects.template', $project),
                'timeline_url' => route('projects.timeline', $project),
                'create_task_url' => route('projects.tasks.store', $project),
                'assignee_options' => $this->assigneeOptions(),
                'parent_task_options' => $this->parentTaskOptions($tasks),
                'task_summary' => $this->taskSummary($tasks),
                'task_groups' => $this->taskGroups($tasks),
            ],
        ]);
    }

    protected function assigneeOptions(): array
    {
        return [
            [
                'value' => null,
                'label' => 'Unassigned',
            ],
            ...User::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (User $user): array => [
                    'value' => $user->id,
                    'label' => $user->name,
                ])
                ->all(),
        ];
    }

    protected function parentTaskOptions(Collection $tasks): array
    {
        return $tasks
            ->map(fn (Task $task): array => [
                'id' => $task->id,
                'name' => $task->name,
                'kind' => $task->kind,
                'parent_id' => $task->parent_id,
            ])
            ->values()
            ->all();
    }

    protected function taskSummary(Collection $tasks): array
    {
        $parentTaskIds = $tasks->pluck('parent_id')->filter()->unique();

        return [
            'total' => $tasks->count(),
            'completed' => $tasks->where('completed', true)->count(),
            'open' => $tasks->where('completed', false)->count(),
            'groups' => $tasks
                ->filter(fn (Task $task): bool => $task->kind === Task::KIND_GROUP || $parentTaskIds->contains($task->id))
                ->count(),
        ];
    }

    protected function taskGroups(Collection $tasks): array
    {
        return $tasks
            ->groupBy(fn (Task $task): string => $task->assignee_user_id ? sprintf('user:%s', $task->assignee_user_id) : 'unassigned')
            ->map(fn (Collection $groupTasks): array => [
                'assignee_id' => $groupTasks->first()?->assignee_user_id,
                'assignee_name' => $groupTasks->first()?->assigneeLabel() ?? 'Unassigned',
                'task_count' => $groupTasks->count(),
                'completed_count' => $groupTasks->where('completed', true)->count(),
                'tasks' => $groupTasks
                    ->sortBy([
                        ['sort_order', 'asc'],
                        ['start_date', 'asc'],
                        ['name', 'asc'],
                    ])
                    ->map(fn (Task $task): array => [
                        'id' => $task->id,
                        'name' => $task->name,
                        'description' => $task->description,
                        'kind' => $task->kind,
                        'parent_id' => $task->parent_id,
                        'parent_name' => $task->parent?->name,
                        'assignee_user_id' => $task->assignee_user_id,
                        'start_date' => $task->start_date?->toDateString(),
                        'end_date' => $task->end_date?->toDateString(),
                        'progress' => $task->progress,
                        'completed' => $task->completed,
                        'update_url' => route('projects.tasks.update', [$task->project_id, $task]),
                        'duplicate_url' => route('projects.tasks.duplicate', [$task->project_id, $task]),
                        'destroy_url' => route('projects.tasks.destroy', [$task->project_id, $task]),
                    ])
                    ->values()
                    ->all(),
            ])
            ->sortBy([
                ['assignee_id', 'desc'],
                ['assignee_name', 'asc'],
            ])
            ->values()
            ->all();
    }
}
