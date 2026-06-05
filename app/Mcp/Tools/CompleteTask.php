<?php

namespace App\Mcp\Tools;

use App\Mcp\PlannerMcpContext;
use App\Services\ProjectTaskService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Mark a task complete and set progress to 100.')]
class CompleteTask extends Tool
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
        ]);

        $team = $this->context->teamForSlug($validated['team_slug'], 'planner:write');
        $task = $this->context->taskForTeam($team, $validated['task_id']);
        $project = $task->project()->firstOrFail();

        $this->projectTaskService->update($team, $project, $task, [
            'completed' => true,
        ]);

        $task->refresh()->load('assigneeUser');

        return Response::json([
            'task' => [
                'id' => $task->id,
                'name' => $task->name,
                'assignee_user_id' => $task->assignee_user_id,
                'assignee_name' => $task->assigneeLabel(),
                'progress' => $task->progress,
                'completed' => $task->completed,
            ],
        ]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'team_slug' => $schema->string()->required(),
            'task_id' => $schema->string()->format('uuid')->required(),
        ];
    }

    public function shouldRegister(): bool
    {
        return $this->context->canUse('planner:write');
    }
}
