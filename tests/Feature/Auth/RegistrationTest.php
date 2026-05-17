<?php

namespace Tests\Feature\Auth;

use App\Models\Team;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertOk();
    }

    public function test_new_users_register_a_team_and_are_redirected_to_team_planner(): void
    {
        Notification::fake();

        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'team_name' => 'Launch Team',
            'team_slug' => 'launch-team',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $team = Team::query()->where('slug', 'launch-team')->firstOrFail();
        $user = User::query()->where('email', 'test@example.com')->firstOrFail();

        $this->assertAuthenticatedAs($user);
        $this->assertSame('Launch Team', $team->name);
        $this->assertSame($team->id, $user->team_id);
        $this->assertSame($user->id, $team->owner_user_id);
        $this->assertFalse($user->is_admin);
        $this->assertSame(2, Project::query()->where('team_id', $team->id)->count());
        $this->assertSame(10, Task::query()
            ->whereIn('project_id', $team->projects()->pluck('id'))
            ->count());
        $this->assertDatabaseHas('projects', [
            'team_id' => $team->id,
            'name' => 'Default Planning Board',
        ]);
        Notification::assertSentTo($user, VerifyEmail::class);
        $response->assertRedirect(route('planner', $team, absolute: false));
    }

    public function test_team_slugs_are_reserved_and_unique(): void
    {
        Team::factory()->create(['slug' => 'existing-team']);

        $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'team_name' => 'Existing Team',
            'team_slug' => 'existing-team',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertSessionHasErrors('team_slug');

        $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'team_name' => 'Admin Team',
            'team_slug' => 'admin',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertSessionHasErrors('team_slug');
    }
}
