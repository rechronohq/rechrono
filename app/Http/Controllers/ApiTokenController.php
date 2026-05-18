<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreApiTokenRequest;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;
use Laravel\Sanctum\PersonalAccessToken;

class ApiTokenController extends Controller
{
    public function store(StoreApiTokenRequest $request, Team $team): RedirectResponse
    {
        $validated = $request->validated();
        $abilities = $validated['ability'] === 'planner:write'
            ? ['planner:read', 'planner:write']
            : ['planner:read'];
        $token = $request->user()->createToken($validated['name'], $abilities);

        return Redirect::route('team-settings.edit', $team)
            ->with('status', 'api-token-created')
            ->with('api_token_plain_text', $token->plainTextToken);
    }

    public function destroy(Team $team, string $apiToken): RedirectResponse
    {
        $token = PersonalAccessToken::query()->findOrFail($apiToken);

        abort_unless($token->tokenable_type === $team->users()->getModel()->getMorphClass(), 404);
        abort_unless((int) $token->tokenable_id === request()->user()?->id, 404);

        $token->delete();

        return Redirect::route('team-settings.edit', $team)->with('status', 'api-token-revoked');
    }
}
