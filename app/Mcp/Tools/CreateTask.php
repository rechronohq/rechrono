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

#[Description('Create a new task inside a project.')]
class CreateTask extends Tool
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
            'kind' => ['nullable', 'string', 'in:task,group'],
            'parent_id' => ['nullable', 'uuid'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'dependency_id' => ['nullable', 'uuid'],
            'assignee_user_id' => ['nullable', 'integer'],
        ]);
        $team = $this->context->teamForSlug($validated['team_slug'], 'planner:write');
        $project = $this->context->projectForTeam($team, $validated['project_id']);
        $this->context->taskForProject($project, $validated['parent_id'] ?? null, 'parent_id');
        $this->context->taskForProject($project, $validated['dependency_id'] ?? null, 'dependency_id');
        $this->context->userForTeam($team, $validated['assignee_user_id'] ?? null);

        $task = $this->projectTaskService->create($team, $project, $validated);

        return Response::json([
            'task' => $this->taskPayload($task->fresh(['assigneeUser'])),
        ]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'team_slug' => $schema->string()->required(),
            'project_id' => $schema->string()->format('uuid')->required(),
            'kind' => $schema->string()->nullable(),
            'parent_id' => $schema->string()->nullable()->format('uuid'),
            'name' => $schema->string()->required(),
            'description' => $schema->string()->nullable(),
            'start_date' => $schema->string()->nullable()->format('date'),
            'end_date' => $schema->string()->nullable()->format('date'),
            'dependency_id' => $schema->string()->nullable()->format('uuid'),
            'assignee_user_id' => $schema->integer()->nullable(),
        ];
    }

    public function shouldRegister(): bool
    {
        return $this->context->canUse('planner:write');
    }

    /**
     * @return array<string, mixed>
     */
    protected function taskPayload(Task $task): array
    {
        return [
            'id' => $task->id,
            'project_id' => $task->project_id,
            'parent_id' => $task->parent_id,
            'kind' => $task->kind,
            'name' => $task->name,
            'assignee_user_id' => $task->assignee_user_id,
            'assignee_name' => $task->assigneeLabel(),
            'progress' => $task->progress,
            'completed' => $task->completed,
        ];
    }
}
