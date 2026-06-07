<?php

namespace App\Mcp\Resources;

use App\Mcp\PlannerMcpContext;
use App\Models\Project;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\MimeType;
use Laravel\Mcp\Server\Contracts\HasUriTemplate;
use Laravel\Mcp\Server\Resource;
use Laravel\Mcp\Support\UriTemplate;

#[Description('Read-only project snapshot for the planner.')]
#[MimeType('application/json')]
class ProjectsResource extends Resource implements HasUriTemplate
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
            ->with(['client', 'parent.client'])
            ->withCount('tasks')
            ->timelineVisible()
            ->orderBy('name')
            ->get()
            ->map(function (Project $project): array {
                $client = $project->effectiveClient();

                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'description' => $project->description,
                    'client_id' => $client?->id,
                    'client' => $client ? ['id' => $client->id, 'name' => $client->name] : null,
                    'tasks_count' => $project->tasks_count,
                ];
            })
            ->all();

        return Response::json([
            'projects' => $projects,
        ]);
    }

    public function uriTemplate(): UriTemplate
    {
        return new UriTemplate('planner://{team_slug}/projects');
    }

    public function shouldRegister(): bool
    {
        return $this->context->canUse('planner:read');
    }
}
