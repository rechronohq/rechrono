<?php

namespace App\Mcp\Resources;

use App\Mcp\PlannerMcpContext;
use App\Models\Task;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\MimeType;
use Laravel\Mcp\Server\Contracts\HasUriTemplate;
use Laravel\Mcp\Server\Resource;
use Laravel\Mcp\Support\UriTemplate;

#[Description('Read-only task snapshot for the planner.')]
#[MimeType('application/json')]
class TasksResource extends Resource implements HasUriTemplate
{
    public function __construct(
        protected PlannerMcpContext $context,
    ) {}

    public function handle(Request $request): Response
    {
        $validated = $request->validate([
            'team_slug' => ['required', 'string'],
        ]);
        $team = $this->context->teamForSlug($validated['team_slug'], 'planner:read');

        $tasks = Task::query()
            ->with(['project', 'dependency', 'parent', 'assigneeUser'])
            ->whereIn('project_id', $team->projects()->select('id'))
            ->orderBy('start_date')
            ->orderBy('name')
            ->get()
            ->map(fn (Task $task): array => [
                'id' => $task->id,
                'project_id' => $task->project_id,
                'project_name' => $task->project?->name,
                'parent_id' => $task->parent_id,
                'parent_name' => $task->parent?->name,
                'name' => $task->name,
                'description' => $task->description,
                'start_date' => $task->start_date?->toDateString(),
                'end_date' => $task->end_date?->toDateString(),
                'progress' => $task->progress,
                'completed' => $task->completed,
                'dependency_id' => $task->dependency_id,
                'dependency_name' => $task->dependency?->name,
                'assignee_user_id' => $task->assignee_user_id,
                'assignee_name' => $task->assigneeLabel(),
            ])
            ->all();

        return Response::json([
            'tasks' => $tasks,
        ]);
    }

    public function uriTemplate(): UriTemplate
    {
        return new UriTemplate('planner://{team_slug}/tasks');
    }

    public function shouldRegister(): bool
    {
        return $this->context->canUse('planner:read');
    }
}
