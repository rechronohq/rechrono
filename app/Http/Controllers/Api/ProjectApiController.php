<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use App\Models\Team;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProjectApiController extends Controller
{
    public function index(Team $team): AnonymousResourceCollection
    {
        return ProjectResource::collection(
            $team->projects()
                ->timelineVisible()
                ->orderBy('name')
                ->get(),
        );
    }

    public function show(Team $team, Project $project): ProjectResource
    {
        return ProjectResource::make(
            $project->load([
                'tasks' => fn ($query) => $query
                    ->orderBy('sort_order')
                    ->orderBy('start_date')
                    ->orderBy('name'),
            ]),
        );
    }
}
