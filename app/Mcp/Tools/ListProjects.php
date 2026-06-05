<?php

namespace App\Mcp\Tools;

use App\Mcp\PlannerMcpContext;
use App\Models\Project;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Description('List projects with task counts for the planner.')]
#[IsReadOnly]
class ListProjects extends Tool
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

        $projects = $team->projects()
            ->withCount('tasks')
            ->timelineVisible()
            ->orderBy('name')
            ->get()
            ->map(fn (Project $project): array => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'tasks_count' => $project->tasks_count,
            ])
            ->all();

        return Response::json([
            'projects' => $projects,
        ]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'team_slug' => $schema->string()->required(),
        ];
    }

    public function shouldRegister(): bool
    {
        return $this->context->canUse('planner:read');
    }
}
