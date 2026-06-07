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
        $project->load(['client', 'parent.client']);
        $client = $project->effectiveClient();

        return Inertia::render('Projects/Edit', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'budget_hours' => $project->budget_hours === null ? null : (float) $project->budget_hours,
                'parent_id' => $project->parent_id,
                'client_id' => $client?->id,
                'client' => $client ? ['id' => $client->id, 'name' => $client->name] : null,
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
            'clientOptions' => $team->clients()
                ->where(fn ($query) => $query->where('is_active', true)->when(
                    $project->parent_id === null && $project->client_id !== null,
                    fn ($query) => $query->orWhereKey($project->client_id),
                ))
                ->get(['id', 'name'])
                ->map(fn ($client): array => ['id' => $client->id, 'name' => $client->name])
                ->all(),
        ]);
    }

    protected function currentTeam(Request $request): Team
    {
        /** @var Team $team */
        $team = $request->route('team');

        return $team;
    }
}
