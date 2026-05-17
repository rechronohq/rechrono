<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTeamInviteRequest;
use App\Models\Team;
use App\Models\TeamInvitation;
use App\Notifications\TeamInvitationNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Redirect;

class TeamInviteController extends Controller
{
    public function store(StoreTeamInviteRequest $request, Team $team): RedirectResponse
    {
        $invitation = $team->invitations()->create([
            'invited_by_user_id' => $request->user()->id,
            'email' => $request->validated('email'),
            'token' => TeamInvitation::generateToken(),
        ]);

        Notification::route('mail', $invitation->email)
            ->notify(new TeamInvitationNotification($invitation));

        return Redirect::route('team-settings.edit', $team)->with('status', 'invite-sent');
    }

    public function destroy(Request $request, Team $team, TeamInvitation $invitation): RedirectResponse
    {
        abort_unless($team->owner_user_id === $request->user()?->id, 403);
        abort_unless($invitation->team_id === $team->id, 404);
        abort_unless($invitation->isPending(), 404);

        $invitation->delete();

        return Redirect::route('team-settings.edit', $team)->with('status', 'invite-cancelled');
    }
}
