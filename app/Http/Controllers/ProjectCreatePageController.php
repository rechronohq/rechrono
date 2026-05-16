<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Inertia\Inertia;
use Inertia\Response;

class ProjectCreatePageController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Projects/Create', [
            'projects' => $this->projectOptions(),
            'templateProjects' => Project::query()
                ->templates()
                ->roots()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Project $project): array => [
                    'id' => $project->id,
                    'name' => $project->name,
                ])->all(),
        ]);
    }

    protected function projectOptions(): array
    {
        return Project::query()
            ->plannerVisible()
            ->active()
            ->get()
            ->map(fn (Project $project): array => [
                'id' => $project->id,
                'name' => $project->name,
                'parent_id' => $project->parent_id,
            ])->all();
    }
}
