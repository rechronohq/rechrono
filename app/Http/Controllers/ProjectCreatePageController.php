<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Team;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectCreatePageController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $team = $this->currentTeam($request);

        return Inertia::render('Projects/Create', [
            'projects' => $this->projectOptions($team),
            'templateProjects' => $team->projects()
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

    protected function projectOptions(Team $team): array
    {
        return $team->projects()
            ->plannerVisible()
            ->active()
            ->get()
            ->map(fn (Project $project): array => [
                'id' => $project->id,
                'name' => $project->name,
                'parent_id' => $project->parent_id,
            ])->all();
    }

    protected function currentTeam(Request $request): Team
    {
        /** @var Team $team */
        $team = $request->route('team');

        return $team;
    }
}
