<?php

namespace App\Mcp\Tools;

use App\Mcp\PlannerMcpContext;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Description('Read one planner project with its ordered tasks.')]
#[IsReadOnly]
class ReadProject extends Tool
{
    public function __construct(
        protected PlannerMcpContext $context,
    ) {}

    public function handle(Request $request): Response
    {
        $validated = $request->validate([
            'team_slug' => ['required', 'string'],
            'project_id' => ['required', 'uuid'],
        ]);
        $team = $this->context->teamForSlug($validated['team_slug'], 'planner:read');
        $project = $this->context->projectForTeam($team, $validated['project_id']);

        $project->load([
            'tasks' => fn ($query) => $query
                ->orderBy('sort_order')
                ->orderBy('start_date')
                ->orderBy('name'),
        ]);

        return Response::json([
            'project' => $this->projectPayload($project),
        ]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'team_slug' => $schema->string()->required(),
            'project_id' => $schema->string()->format('uuid')->required(),
        ];
    }

    public function shouldRegister(): bool
    {
        return $this->context->canUse('planner:read');
    }

    /**
     * @return array<string, mixed>
     */
    protected function projectPayload(Project $project): array
    {
        return [
            'id' => $project->id,
            'team_id' => $project->team_id,
            'parent_id' => $project->parent_id,
            'name' => $project->name,
            'description' => $project->description,
            'is_template' => $project->is_template,
            'is_active' => $project->is_active,
            'tasks' => $project->tasks->map(fn (Task $task): array => [
                'id' => $task->id,
                'project_id' => $task->project_id,
                'parent_id' => $task->parent_id,
                'kind' => $task->kind,
                'name' => $task->name,
                'description' => $task->description,
                'start_date' => $task->start_date?->toDateString(),
                'end_date' => $task->end_date?->toDateString(),
                'progress' => $task->progress,
                'completed' => $task->completed,
                'dependency_id' => $task->dependency_id,
                'assignee_user_id' => $task->assignee_user_id,
                'sort_order' => $task->sort_order,
            ])->values()->all(),
        ];
    }
}
