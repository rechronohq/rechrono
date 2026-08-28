<?php

namespace App\Mcp\Tools;

use App\Mcp\PlannerMcpContext;
use App\Mcp\Tools\Concerns\SerializesProjects;
use App\Services\ProjectService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Archive a project. This is reversible with unarchive-project.')]
class ArchiveProject extends Tool
{
    use SerializesProjects;

    public function __construct(protected PlannerMcpContext $context, protected ProjectService $projectService) {}

    public function handle(Request $request): Response
    {
        $validated = $request->validate(['team_slug' => ['required', 'string'], 'project_id' => ['required', 'uuid']]);
        $team = $this->context->teamForSlug($validated['team_slug'], 'planner:write');
        $project = $this->context->projectForTeam($team, $validated['project_id']);
        $this->projectService->bulkAction($team, ['action' => 'archive', 'project_ids' => [$project->id]]);

        return Response::json(['project' => $this->projectPayload($project->refresh())]);
    }

    public function schema(JsonSchema $schema): array
    {
        return ['team_slug' => $schema->string()->required(), 'project_id' => $schema->string()->format('uuid')->required()];
    }

    public function shouldRegister(): bool
    {
        return $this->context->canUse('planner:write');
    }
}
