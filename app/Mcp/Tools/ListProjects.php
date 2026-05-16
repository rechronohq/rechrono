<?php

namespace App\Mcp\Tools;

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

    public function schema(JsonSchema $schema): array
    {
        return [];
    }
}
