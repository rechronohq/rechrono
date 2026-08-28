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

#[Description('Update a planner project name, description, parent, or client.')]
class UpdateProject extends Tool
{
    use SerializesProjects;

    public function __construct(protected PlannerMcpContext $context, protected ProjectService $projectService) {}

    public function handle(Request $request): Response
    {
        $validated = $request->validate([
            'team_slug' => ['required', 'string'],
            'project_id' => ['required', 'uuid'],
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'parent_id' => ['sometimes', 'nullable', 'uuid'],
            'client_id' => ['sometimes', 'nullable', 'uuid'],
        ]);
        $team = $this->context->teamForSlug($validated['team_slug'], 'planner:write');
        $project = $this->context->projectForTeam($team, $validated['project_id']);

        if (isset($validated['parent_id'])) {
            $this->context->projectForTeam($team, $validated['parent_id'], 'parent_id');
        }
        if (array_key_exists('client_id', $validated)) {
            $this->context->clientForTeam($team, $validated['client_id']);
        }

        $project = $this->projectService->update($team, $project, [
            ...$validated,
            'name' => $validated['name'] ?? $project->name,
            'parent_id' => array_key_exists('parent_id', $validated) ? $validated['parent_id'] : $project->parent_id,
        ]);

        return Response::json(['project' => $this->projectPayload($project)]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'team_slug' => $schema->string()->required(),
            'project_id' => $schema->string()->format('uuid')->required(),
            'name' => $schema->string(),
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
