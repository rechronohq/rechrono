<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterTeamRequest;
use App\Models\Team;
use App\Models\User;
use App\Support\StarterWorkspaceSeeder;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredTeamController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    public function store(RegisterTeamRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        [$team, $user] = DB::transaction(function () use ($validated): array {
            $team = Team::query()->create([
                'name' => $validated['team_name'],
                'slug' => $validated['team_slug'],
            ]);

            $user = User::query()->create([
                'team_id' => $team->id,
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
                'is_admin' => false,
            ]);

            $team->update(['owner_user_id' => $user->id]);
            app(StarterWorkspaceSeeder::class)->seed($team);

            return [$team->fresh(), $user];
        });

        event(new Registered($user));

        Auth::login($user);

        return redirect()->route('planner', $team);
    }
}
