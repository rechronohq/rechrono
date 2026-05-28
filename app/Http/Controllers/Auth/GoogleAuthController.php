<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Team;
use App\Models\User;
use App\Support\StarterWorkspaceSeeder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;

class GoogleAuthController extends Controller
{
    public function redirect(): RedirectResponse
    {
        return Socialite::driver('google')->redirect();
    }

    public function callback(): RedirectResponse
    {
        $googleUser = Socialite::driver('google')->user();

        $user = DB::transaction(fn (): User => $this->findOrCreateUser($googleUser));

        Auth::login($user, remember: true);

        request()->session()->regenerate();

        return redirect()->intended(route('planner', $user->team, absolute: false));
    }

    private function findOrCreateUser(SocialiteUser $googleUser): User
    {
        $email = $googleUser->getEmail();

        abort_if(! $email, 422, 'Google did not return an email address.');

        $user = User::query()->where('email', $email)->first();

        if ($user) {
            if (! $user->email_verified_at) {
                $user->forceFill(['email_verified_at' => now()])->save();
            }

            return $user;
        }

        $team = Team::query()->create([
            'name' => $this->workspaceName($googleUser),
            'slug' => $this->uniqueTeamSlug($email),
        ]);

        $user = User::query()->create([
            'team_id' => $team->id,
            'name' => $googleUser->getName() ?: Str::before($email, '@'),
            'email' => $email,
            'password' => Str::random(64),
            'is_admin' => false,
        ]);

        $user->forceFill(['email_verified_at' => now()])->save();
        $team->update(['owner_user_id' => $user->id]);
        app(StarterWorkspaceSeeder::class)->seed($team);

        return $user;
    }

    private function workspaceName(SocialiteUser $googleUser): string
    {
        $name = trim((string) $googleUser->getName());

        return $name !== '' ? $name : 'My Workspace';
    }

    private function uniqueTeamSlug(string $email): string
    {
        $base = Str::slug(Str::before($email, '@')) ?: 'workspace';

        if (in_array($base, Team::reservedSlugs(), true)) {
            $base = "{$base}-workspace";
        }

        $slug = $base;
        $suffix = 2;

        while (Team::query()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
