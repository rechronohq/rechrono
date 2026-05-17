<?php

namespace App\Http\Middleware;

use App\Models\Team;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTeamAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $team = $request->route('team');
        $user = $request->user();

        if (is_string($team)) {
            $team = Team::query()->where('slug', $team)->first();
            $request->route()?->setParameter('team', $team);
        }

        abort_unless($team instanceof Team && $user?->team_id === $team->id, 404);

        return $next($request);
    }
}
