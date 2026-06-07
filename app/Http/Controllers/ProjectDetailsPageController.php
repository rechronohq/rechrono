<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use App\Support\ProjectDateRangeResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class ProjectDetailsPageController extends Controller
{
    public function __construct(
        protected ProjectDateRangeResolver $projectDateRangeResolver,
    ) {}

    public function __invoke(Request $request, Team $team, Project $project): Response
    {
        $project->load(['client', 'parent.client']);
        $client = $project->effectiveClient();
        [$startDate, $endDate] = $this->projectDateRangeResolver->forProject($project);
        $tasks = $project->tasks()
            ->with(['assigneeUser', 'parent'])
            ->get();

        return Inertia::render('Projects/Show', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'budget_hours' => $project->budget_hours === null ? null : (float) $project->budget_hours,
                'actual_hours' => $team->time_tracking_enabled
                    ? round($project->timeEntries()->whereNotNull('ended_at')->sum('duration_seconds') / 3600, 2)
                    : null,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'is_active' => $project->is_active,
                'is_template' => $project->is_template,
                'client_id' => $client?->id,
                'client' => $client ? [
                    'id' => $client->id,
                    'name' => $client->name,
                    'show_url' => route('clients.show', [$team, $client]),
                ] : null,
                'bulk_action_url' => route('projects.bulk-action', $team),
                'parent' => $project->parent ? [
                    'id' => $project->parent->id,
                    'name' => $project->parent->name,
                    'show_url' => route('projects.show', [$team, $project->parent]),
                ] : null,
                'destroy_url' => route('projects.destroy', [$team, $project]),
                'duplicate_url' => route('projects.duplicate', [$team, $project]),
                'edit_url' => route('projects.edit', [$team, $project]),
                'show_url' => route('projects.show', [$team, $project]),
                'template_url' => route('projects.template', [$team, $project]),
                'timeline_url' => route('projects.timeline', [$team, $project]),
                'create_task_url' => route('projects.tasks.store', [$team, $project]),
                'bulk_assign_tasks_url' => route('projects.tasks.bulk-assign', [$team, $project]),
                'assignee_options' => $this->assigneeOptions($team),
                'parent_task_options' => $this->parentTaskOptions($tasks),
                'task_summary' => $this->taskSummary($tasks),
                'task_groups' => $this->taskGroups($team, $tasks),
            ],
        ]);
    }

    protected function assigneeOptions(Team $team): array
    {
        return [
            [
                'value' => null,
                'label' => 'Unassigned',
            ],
            ...$team->users()
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

    protected function taskGroups(Team $team, Collection $tasks): array
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
                        'update_url' => route('projects.tasks.update', [$team, $task->project_id, $task]),
                        'duplicate_url' => route('projects.tasks.duplicate', [$team, $task->project_id, $task]),
                        'destroy_url' => route('projects.tasks.destroy', [$team, $task->project_id, $task]),
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

    protected function currentTeam(Request $request): Team
    {
        /** @var Team $team */
        $team = $request->route('team');

        return $team;
    }
}
