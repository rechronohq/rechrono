<?php

namespace Tests\Feature\Auth;

use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

class GoogleAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_can_redirect_to_google_for_authentication(): void
    {
        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('redirect')
            ->once()
            ->andReturn(redirect('https://accounts.google.com/o/oauth2/auth'));

        Socialite::shouldReceive('driver')
            ->once()
            ->with('google')
            ->andReturn($provider);

        $response = $this->get('/auth/google');

        $response->assertRedirect('https://accounts.google.com/o/oauth2/auth');
    }

    public function test_existing_users_can_authenticate_with_google_by_email(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'existing@example.com',
        ]);

        $this->mockGoogleCallbackUser('google-123', 'Existing User', 'existing@example.com');

        $response = $this->get('/auth/google/callback');

        $this->assertAuthenticatedAs($user);
        $this->assertNotNull($user->fresh()->email_verified_at);
        $response->assertRedirect(route('planner', $user->team, absolute: false));
    }

    public function test_new_google_users_get_a_team_and_starter_workspace(): void
    {
        $this->mockGoogleCallbackUser('google-456', 'New Google User', 'new@example.com');

        $response = $this->get('/auth/google/callback');

        $user = User::query()->where('email', 'new@example.com')->firstOrFail();
        $team = Team::query()->where('owner_user_id', $user->id)->firstOrFail();

        $this->assertAuthenticatedAs($user);
        $this->assertSame($team->id, $user->team_id);
        $this->assertSame('New Google User', $user->name);
        $this->assertNotNull($user->email_verified_at);
        $this->assertSame(2, Project::query()->where('team_id', $team->id)->count());
        $response->assertRedirect(route('planner', $team, absolute: false));
    }

    private function mockGoogleCallbackUser(string $id, string $name, string $email): void
    {
        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('user')
            ->once()
            ->andReturn((new SocialiteUser)->map([
                'id' => $id,
                'name' => $name,
                'email' => $email,
            ]));

        Socialite::shouldReceive('driver')
            ->once()
            ->with('google')
            ->andReturn($provider);
    }
}
