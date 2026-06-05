<?php

namespace App\Mcp\Tools;

use App\Mcp\PlannerMcpContext;
use App\Models\Task;
use App\Services\ProjectTaskService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Reorder a task before, after, or into another task in the same project.')]
class ReorderTask extends Tool
{
    public function __construct(
        protected PlannerMcpContext $context,
        protected ProjectTaskService $projectTaskService,
    ) {}

    public function handle(Request $request): Response
    {
        $validated = $request->validate([
            'team_slug' => ['required', 'string'],
            'project_id' => ['required', 'uuid'],
            'task_id' => ['required', 'uuid'],
            'target_task_id' => ['required', 'uuid'],
            'position' => ['required', 'string', 'in:before,after,into'],
        ]);
        $team = $this->context->teamForSlug($validated['team_slug'], 'planner:write');
        $project = $this->context->projectForTeam($team, $validated['project_id']);
        $this->context->taskForProject($project, $validated['task_id'], 'task_id');
        $this->context->taskForProject($project, $validated['target_task_id'], 'target_task_id');

        $this->projectTaskService->reorder($project, $validated);

        $tasks = $project->tasks()
            ->whereNull('parent_id')
            ->orderBy('sort_order')
            ->orderBy('start_date')
            ->orderBy('name')
            ->get()
            ->map(fn (Task $task): array => [
                'id' => $task->id,
                'project_id' => $task->project_id,
                'parent_id' => $task->parent_id,
                'kind' => $task->kind,
                'name' => $task->name,
                'sort_order' => $task->sort_order,
            ])
            ->all();

        return Response::json([
            'tasks' => $tasks,
        ]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'team_slug' => $schema->string()->required(),
            'project_id' => $schema->string()->format('uuid')->required(),
            'task_id' => $schema->string()->format('uuid')->required(),
            'target_task_id' => $schema->string()->format('uuid')->required(),
            'position' => $schema->string()->required(),
        ];
    }

    public function shouldRegister(): bool
    {
        return $this->context->canUse('planner:write');
    }
}
