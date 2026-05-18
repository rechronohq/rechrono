<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateTeamRequest;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class TeamSettingsController extends Controller
{
    public function edit(Request $request, Team $team): Response
    {
        $team->load(['users', 'pendingInvitations']);

        $currentUserId = $request->user()?->id;

        $members = $team->users
            ->map(function ($user) use ($team, $currentUserId): array {
                $isOwner = $team->owner_user_id === $user->id;
                $canRemove = $team->owner_user_id === $currentUserId
                    && ! $isOwner
                    && $user->id !== $currentUserId;

                return [
                    'id' => $user->id,
                    'type' => 'member',
                    'name' => $user->name,
                    'email' => $user->email,
                    'is_owner' => $isOwner,
                    'destroy_url' => $canRemove ? route('team-members.destroy', [$team, $user]) : null,
                ];
            })
            ->values();

        $canManageInvites = $team->owner_user_id === $currentUserId;

        $invitations = $team->pendingInvitations
            ->map(fn ($invitation): array => [
                'id' => $invitation->id,
                'type' => 'invitation',
                'name' => null,
                'email' => $invitation->email,
                'is_owner' => false,
                'destroy_url' => $canManageInvites ? route('team-invites.destroy', [$team, $invitation]) : null,
            ])
            ->values();

        return Inertia::render('Team/Settings', [
            'team' => [
                'name' => $team->name,
                'slug' => $team->slug,
            ],
            'members' => $members->concat($invitations)->sortBy('email')->values()->all(),
            'apiTokens' => $request->user()
                ? $request->user()->tokens()
                    ->orderByDesc('created_at')
                    ->get(['id', 'name', 'last_used_at', 'created_at'])
                    ->map(fn ($token): array => [
                        'id' => $token->id,
                        'name' => $token->name,
                        'last_used_at' => $token->last_used_at?->toJSON(),
                        'created_at' => $token->created_at?->toJSON(),
                        'destroy_url' => route('api-tokens.destroy', [$team, $token]),
                    ])
                    ->all()
                : [],
            'newApiToken' => $request->session()->get('api_token_plain_text'),
            'teamSettingsRoutes' => [
                'teamSettingsUpdate' => route('team-settings.update', $team),
                'teamInvitesStore' => route('team-invites.store', $team),
                'apiTokensStore' => route('api-tokens.store', $team),
            ],
        ]);
    }

    public function update(UpdateTeamRequest $request, Team $team): RedirectResponse
    {
        $team->update($request->validated());

        return Redirect::route('team-settings.edit', $team)->with('status', 'team-updated');
    }
}
