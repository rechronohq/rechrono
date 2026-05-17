<?php

namespace App\Http\Controllers;

use App\Models\Team;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;

class TeamMemberController extends Controller
{
    public function destroy(Request $request, Team $team, User $user): RedirectResponse
    {
        abort_unless($team->owner_user_id === $request->user()?->id, 403);
        abort_unless($user->team_id === $team->id, 404);
        abort_if($team->owner_user_id === $user->id, 403);
        abort_if($request->user()?->id === $user->id, 403);

        $user->delete();

        return Redirect::route('team-settings.edit', $team)->with('status', 'member-removed');
    }
}
