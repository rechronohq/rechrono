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
            'status' => ['nullable', 'string', 'in:active,archived,all,templates'],
        ]);
        $team = $this->context->teamForSlug($validated['team_slug'], 'planner:read');
        $status = $validated['status'] ?? 'active';

        $projects = $team->projects()
            ->with(['client', 'parent.client'])
            ->withCount('tasks')
            ->when($status === 'active', fn ($query) => $query->plannerVisible()->active())
            ->when($status === 'archived', fn ($query) => $query->plannerVisible()->archived())
            ->when($status === 'all', fn ($query) => $query->plannerVisible())
            ->when($status === 'templates', fn ($query) => $query->templates())
            ->orderBy('name')
            ->get()
            ->map(function (Project $project): array {
                $client = $project->effectiveClient();

                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'description' => $project->description,
                    'parent_id' => $project->parent_id,
                    'client_id' => $client?->id,
                    'client' => $client ? ['id' => $client->id, 'name' => $client->name] : null,
                    'tasks_count' => $project->tasks_count,
                    'is_active' => $project->is_active,
                    'is_template' => $project->is_template,
                ];
            })
            ->all();

        return Response::json([
            'projects' => $projects,
        ]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'team_slug' => $schema->string()->required(),
            'status' => $schema->string()->nullable(),
        ];
    }

    public function shouldRegister(): bool
    {
        return $this->context->canUse('planner:read');
    }
}
