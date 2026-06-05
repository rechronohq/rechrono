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
    private const DEFAULT_SECTION = 'workspace-profile';

    private const SECTIONS = [
        'workspace-profile',
        'modules',
        'members',
        'api-tokens',
    ];

    public function edit(Request $request, Team $team): Response
    {
        return $this->renderSettings($request, $team, self::DEFAULT_SECTION);
    }

    public function section(Request $request, Team $team, string $section): Response
    {
        abort_unless(in_array($section, self::SECTIONS, true), 404);

        return $this->renderSettings($request, $team, $section);
    }

    private function renderSettings(Request $request, Team $team, string $activeSection): Response
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
                'time_tracking_enabled' => $team->time_tracking_enabled,
            ],
            'members' => $members->concat($invitations)->sortBy('email')->values()->all(),
            'activeSection' => $activeSection,
            'apiTokens' => $request->user()
                ? $request->user()->tokens()
                    ->orderByDesc('created_at')
                    ->get(['id', 'name', 'abilities', 'last_used_at', 'created_at'])
                    ->map(fn ($token): array => [
                        'id' => $token->id,
                        'name' => $token->name,
                        'abilities' => $token->abilities,
                        'last_used_at' => $token->last_used_at?->toJSON(),
                        'created_at' => $token->created_at?->toJSON(),
                        'destroy_url' => route('api-tokens.destroy', [$team, $token]),
                    ])
                    ->all()
                : [],
            'newApiToken' => $request->session()->get('api_token_plain_text'),
            'teamSettingsRoutes' => [
                'teamSettingsUpdate' => route('team-settings.update', $team),
                'settingsSections' => collect(self::SECTIONS)
                    ->mapWithKeys(fn (string $section): array => [
                        $section => $section === self::DEFAULT_SECTION
                            ? route('team-settings.edit', $team)
                            : route('team-settings.section', [$team, $section]),
                    ])
                    ->all(),
                'teamInvitesStore' => route('team-invites.store', $team),
                'apiTokensStore' => route('api-tokens.store', $team),
            ],
        ]);
    }

    public function update(UpdateTeamRequest $request, Team $team): RedirectResponse
    {
        $validated = $request->validated();
        $validated['time_tracking_enabled'] = $request->boolean('time_tracking_enabled');

        $team->update($validated);

        $section = $request->input('section') === 'modules' ? 'modules' : self::DEFAULT_SECTION;

        if ($section === self::DEFAULT_SECTION) {
            return Redirect::route('team-settings.edit', $team)->with('status', 'team-updated');
        }

        return Redirect::route('team-settings.section', [$team, $section])->with('status', 'team-updated');
    }
}
