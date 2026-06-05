<?php

namespace App\Mcp\Tools;

use App\Mcp\PlannerMcpContext;
use App\Services\ProjectTaskService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Update task dates, progress, completion, or dependency.')]
class UpdateTask extends Tool
{
    public function __construct(
        protected PlannerMcpContext $context,
        protected ProjectTaskService $projectTaskService,
    ) {}

    public function handle(Request $request): Response
    {
        $validated = $request->validate([
            'team_slug' => ['required', 'string'],
            'task_id' => ['required', 'uuid'],
            'name' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'kind' => ['nullable', 'string', 'in:task,group'],
            'project_id' => ['nullable', 'uuid'],
            'parent_id' => ['nullable', 'uuid'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'progress' => ['nullable', 'integer', 'between:0,100'],
            'interaction' => ['nullable', 'string', 'in:move,resize_left,resize_right,dependency_set,dependency_clear'],
            'dependency_id' => ['nullable', 'uuid'],
            'completed' => ['nullable', 'boolean'],
            'assignee_user_id' => ['nullable', 'integer'],
        ]);
        $team = $this->context->teamForSlug($validated['team_slug'], 'planner:write');
        $task = $this->context->taskForTeam($team, $validated['task_id']);
        $project = $task->project()->firstOrFail();

        if (isset($validated['project_id'])) {
            $this->context->projectForTeam($team, $validated['project_id']);
        }

        $this->context->taskForTeam($team, $validated['parent_id'] ?? null, 'parent_id');
        $this->context->taskForTeam($team, $validated['dependency_id'] ?? null, 'dependency_id');

        if (array_key_exists('assignee_user_id', $validated)) {
            $this->context->userForTeam($team, $validated['assignee_user_id']);
        }

        $this->projectTaskService->update($team, $project, $task, collect($validated)->except('team_slug', 'task_id')->all());

        $task->refresh()->load('assigneeUser');

        return Response::json([
            'task' => [
                'id' => $task->id,
                'name' => $task->name,
                'start_date' => $task->start_date?->toDateString(),
                'end_date' => $task->end_date?->toDateString(),
                'progress' => $task->progress,
                'completed' => $task->completed,
                'parent_id' => $task->parent_id,
                'dependency_id' => $task->dependency_id,
                'assignee_user_id' => $task->assignee_user_id,
                'assignee_name' => $task->assigneeLabel(),
            ],
        ]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'team_slug' => $schema->string()->required(),
            'task_id' => $schema->string()->format('uuid')->required(),
            'name' => $schema->string()->nullable(),
            'description' => $schema->string()->nullable(),
            'kind' => $schema->string()->nullable(),
            'project_id' => $schema->string()->nullable()->format('uuid'),
            'parent_id' => $schema->string()->nullable()->format('uuid'),
            'start_date' => $schema->string()->nullable()->format('date'),
            'end_date' => $schema->string()->nullable()->format('date'),
            'progress' => $schema->integer()->nullable(),
            'interaction' => $schema->string()->nullable(),
            'dependency_id' => $schema->string()->nullable()->format('uuid'),
            'completed' => $schema->boolean()->nullable(),
            'assignee_user_id' => $schema->integer()->nullable(),
        ];
    }

    public function shouldRegister(): bool
    {
        return $this->context->canUse('planner:write');
    }
}
