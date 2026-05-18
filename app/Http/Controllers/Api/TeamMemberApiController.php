<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TeamMemberResource;
use App\Models\Team;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TeamMemberApiController extends Controller
{
    public function index(Team $team): AnonymousResourceCollection
    {
        return TeamMemberResource::collection(
            $team->users()
                ->get(['id', 'team_id', 'name', 'email']),
        );
    }
}
