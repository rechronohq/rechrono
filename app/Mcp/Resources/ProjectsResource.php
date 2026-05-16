<?php

namespace App\Mcp\Resources;

use App\Models\Project;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\MimeType;
use Laravel\Mcp\Server\Attributes\Uri;
use Laravel\Mcp\Server\Resource;

#[Description('Read-only project snapshot for the planner.')]
#[MimeType('application/json')]
#[Uri('planner://projects')]
class ProjectsResource extends Resource
{
    public function handle(Request $request): Response
    {
        $projects = Project::query()
            ->withCount('tasks')
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
}
