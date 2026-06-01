<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Team;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectEditPageController extends Controller
{
    public function __invoke(Request $request, Team $team, Project $project): Response
    {
        return Inertia::render('Projects/Edit', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'budget_hours' => $project->budget_hours === null ? null : (float) $project->budget_hours,
                'parent_id' => $project->parent_id,
                'show_url' => route('projects.show', [$team, $project]),
            ],
            'projects' => $team->projects()
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

    protected function currentTeam(Request $request): Team
    {
        /** @var Team $team */
        $team = $request->route('team');

        return $team;
    }
}
