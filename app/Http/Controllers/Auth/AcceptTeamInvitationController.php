<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\AcceptTeamInvitationRequest;
use App\Models\TeamInvitation;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class AcceptTeamInvitationController extends Controller
{
    public function show(string $token): Response
    {
        $invitation = $this->findPendingInvitation($token);

        return Inertia::render('Auth/AcceptInvite', [
            'invitation' => [
                'email' => $invitation->email,
                'team_name' => $invitation->team->name,
            ],
            'routes' => [
                'accept' => route('team-invitations.store', $token),
            ],
        ]);
    }

    public function store(AcceptTeamInvitationRequest $request, string $token): RedirectResponse
    {
        $invitation = $this->findPendingInvitation($token);

        $user = User::query()->create([
            'name' => $request->validated('name'),
            'email' => $invitation->email,
            'team_id' => $invitation->team_id,
            'password' => $request->validated('password'),
            'is_admin' => false,
        ]);

        $invitation->update(['accepted_at' => now()]);

        event(new Registered($user));

        Auth::login($user);

        return redirect()->route('planner', $invitation->team);
    }

    protected function findPendingInvitation(string $token): TeamInvitation
    {
        $invitation = TeamInvitation::query()
            ->with('team')
            ->where('token', $token)
            ->whereNull('accepted_at')
            ->first();

        if ($invitation === null) {
            throw new NotFoundHttpException;
        }

        if (User::query()->where('email', $invitation->email)->exists()) {
            throw new NotFoundHttpException;
        }

        return $invitation;
    }
}
