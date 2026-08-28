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

#[Description('Create a project or subproject in the planner.')]
class CreateProject extends Tool
{
    use SerializesProjects;

    public function __construct(protected PlannerMcpContext $context, protected ProjectService $projectService) {}

    public function handle(Request $request): Response
    {
        $validated = $request->validate([
            'team_slug' => ['required', 'string'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'parent_id' => ['nullable', 'uuid'],
            'client_id' => ['nullable', 'uuid'],
        ]);
        $team = $this->context->teamForSlug($validated['team_slug'], 'planner:write');
        if (isset($validated['parent_id'])) {
            $this->context->projectForTeam($team, $validated['parent_id'], 'parent_id');
        }
        $this->context->clientForTeam($team, $validated['client_id'] ?? null);

        $project = $this->projectService->create($team, $validated);

        return Response::json(['project' => $this->projectPayload($project)]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'team_slug' => $schema->string()->required(),
            'name' => $schema->string()->required(),
            'description' => $schema->string()->nullable(),
            'parent_id' => $schema->string()->nullable()->format('uuid'),
            'client_id' => $schema->string()->nullable()->format('uuid'),
        ];
    }

    public function shouldRegister(): bool
    {
        return $this->context->canUse('planner:write');
    }
}
