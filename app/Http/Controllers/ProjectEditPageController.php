<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Inertia\Inertia;
use Inertia\Response;

class ProjectEditPageController extends Controller
{
    public function __invoke(Project $project): Response
    {
        return Inertia::render('Projects/Edit', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'parent_id' => $project->parent_id,
            ],
            'projects' => Project::query()
                ->plannerVisible()
                ->active()
                ->get(['id', 'name', 'parent_id'])
                ->map(fn (Project $option): array => [
                    'id' => $option->id,
                    'name' => $option->name,
                    'parent_id' => $option->parent_id,
                ])->all(),
        ]);
    }
}
