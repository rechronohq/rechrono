<?php

namespace Tests\Feature;

use App\Models\Team;
use App\Models\TeamInvitation;
use App\Models\User;
use App\Notifications\TeamInvitationNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class TeamSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_view_team_settings(): void
    {
        $owner = $this->createTeamOwner();
        $token = $owner->createToken('Existing integration');

        $this->actingAs($owner)
            ->get(route('team-settings.edit', $owner->team))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Team/Settings')
                ->where('team.name', $owner->team->name)
                ->has('members', 1)
                ->where('apiTokens.0.id', $token->accessToken->id)
                ->where('apiTokens.0.name', 'Existing integration')
                ->where('apiTokens.0.abilities.0', '*')
                ->where('teamSettingsRoutes.apiTokensStore', route('api-tokens.store', $owner->team)));
    }

    public function test_owner_can_view_team_settings_sections(): void
    {
        $owner = $this->createTeamOwner();

        foreach (['workspace-profile', 'modules', 'members', 'api-tokens'] as $section) {
            $this->actingAs($owner)
                ->get(route('team-settings.section', [$owner->team, $section]))
                ->assertOk()
                ->assertInertia(fn ($page) => $page
                    ->component('Team/Settings')
                    ->where('activeSection', $section));
        }
    }

    public function test_owner_can_update_team_name_and_slug(): void
    {
        $owner = $this->createTeamOwner();

        $this->actingAs($owner)
            ->patch(route('team-settings.update', $owner->team), [
                'name' => 'Renamed Team',
                'slug' => 'renamed-team',
            ])
            ->assertRedirect(route('team-settings.edit', ['team' => 'renamed-team']));

        $this->assertDatabaseHas('teams', [
            'id' => $owner->team->id,
            'name' => 'Renamed Team',
            'slug' => 'renamed-team',
        ]);
    }

    public function test_non_owner_can_view_but_not_update_team_settings(): void
    {
        $owner = $this->createTeamOwner();
        $member = User::factory()->for($owner->team)->create();

        $this->actingAs($member)
            ->get(route('team-settings.edit', $member->team))
            ->assertOk();

        $this->actingAs($member)
            ->patch(route('team-settings.update', $member->team), [
                'name' => 'Hijacked',
                'slug' => 'hijacked',
            ])
            ->assertForbidden();
    }

    public function test_owner_can_invite_member_by_email(): void
    {
        Notification::fake();

        $owner = $this->createTeamOwner();

        $this->actingAs($owner)
            ->post(route('team-invites.store', $owner->team), [
                'email' => 'new-member@example.com',
            ])
            ->assertRedirect(route('team-settings.section', [$owner->team, 'members']))
            ->assertSessionHas('status', 'invite-sent');

        $invitation = TeamInvitation::query()->where('email', 'new-member@example.com')->first();

        $this->assertNotNull($invitation);
        $this->assertSame($owner->team_id, $invitation->team_id);
        $this->assertNull($invitation->accepted_at);

        Notification::assertSentOnDemand(
            TeamInvitationNotification::class,
            fn ($notification, $channels, $notifiable) => $notifiable->routes['mail'] === 'new-member@example.com',
        );
    }

    public function test_invitation_email_link_loads_accept_invitation_page(): void
    {
        $owner = $this->createTeamOwner();

        $this->actingAs($owner)
            ->post(route('team-invites.store', $owner->team), [
                'email' => 'new-member@example.com',
            ]);

        $invitation = TeamInvitation::query()->where('email', 'new-member@example.com')->firstOrFail();
        $mail = (new TeamInvitationNotification($invitation))->toMail((object) []);

        $this->assertSame('/invite/'.$invitation->token, parse_url($mail->actionUrl, PHP_URL_PATH));

        Auth::logout();

        $this->get($mail->actionUrl)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Auth/AcceptInvite')
                ->where('invitation.email', 'new-member@example.com'));
    }

    public function test_invitation_routes_are_registered_before_team_slug_routes(): void
    {
        $routes = collect(Route::getRoutes()->getRoutes())->values();

        $inviteRouteIndex = $routes->search(fn ($route) => $route->getName() === 'team-invitations.show');
        $firstTeamRouteIndex = $routes->search(fn ($route) => str_starts_with($route->uri(), '{team}/'));

        $this->assertIsInt($inviteRouteIndex);
        $this->assertIsInt($firstTeamRouteIndex);
        $this->assertLessThan($firstTeamRouteIndex, $inviteRouteIndex);
    }

    public function test_invited_user_can_accept_invitation_and_set_their_name(): void
    {
        $owner = $this->createTeamOwner();
        $invitation = TeamInvitation::factory()->for($owner->team)->create([
            'invited_by_user_id' => $owner->id,
            'email' => 'invited@example.com',
        ]);

        $this->get(route('team-invitations.show', $invitation->token))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Auth/AcceptInvite')
                ->where('invitation.email', 'invited@example.com'));

        $this->post(route('team-invitations.store', $invitation->token), [
            'name' => 'Invited Member',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])
            ->assertRedirect(route('planner', $owner->team));

        $this->assertDatabaseHas('users', [
            'email' => 'invited@example.com',
            'name' => 'Invited Member',
            'team_id' => $owner->team_id,
        ]);

        $invitation->refresh();
        $this->assertNotNull($invitation->accepted_at);
    }

    public function test_owner_can_cancel_pending_invitation(): void
    {
        $owner = $this->createTeamOwner();
        $invitation = TeamInvitation::factory()->for($owner->team)->create([
            'invited_by_user_id' => $owner->id,
        ]);

        $this->actingAs($owner)
            ->delete(route('team-invites.destroy', [$owner->team, $invitation]))
            ->assertRedirect(route('team-settings.section', [$owner->team, 'members']))
            ->assertSessionHas('status', 'invite-cancelled');

        $this->assertDatabaseMissing('team_invitations', ['id' => $invitation->id]);
    }

    public function test_owner_can_remove_team_member(): void
    {
        $owner = $this->createTeamOwner();
        $member = User::factory()->for($owner->team)->create();

        $this->actingAs($owner)
            ->delete(route('team-members.destroy', [$owner->team, $member]))
            ->assertRedirect(route('team-settings.section', [$owner->team, 'members']))
            ->assertSessionHas('status', 'member-removed');

        $this->assertDatabaseMissing('users', ['id' => $member->id]);
    }

    public function test_cannot_remove_team_owner(): void
    {
        $owner = $this->createTeamOwner();

        $this->actingAs($owner)
            ->delete(route('team-members.destroy', [$owner->team, $owner]))
            ->assertForbidden();

        $this->assertDatabaseHas('users', ['id' => $owner->id]);
    }

    public function test_owner_cannot_remove_themselves(): void
    {
        $owner = $this->createTeamOwner();
        $member = User::factory()->for($owner->team)->create([
            'email' => 'other-owner@example.com',
        ]);
        $owner->team->update(['owner_user_id' => $member->id]);

        $this->actingAs($member)
            ->delete(route('team-members.destroy', [$member->team, $member]))
            ->assertForbidden();
    }

    public function test_non_owner_cannot_invite_or_remove_members(): void
    {
        $owner = $this->createTeamOwner();
        $member = User::factory()->for($owner->team)->create();
        $target = User::factory()->for($owner->team)->create();
        $invitation = TeamInvitation::factory()->for($owner->team)->create([
            'invited_by_user_id' => $owner->id,
        ]);

        $this->actingAs($member)
            ->post(route('team-invites.store', $member->team), [
                'email' => 'blocked@example.com',
            ])
            ->assertForbidden();

        $this->actingAs($member)
            ->delete(route('team-members.destroy', [$member->team, $target]))
            ->assertForbidden();

        $this->actingAs($member)
            ->delete(route('team-invites.destroy', [$member->team, $invitation]))
            ->assertForbidden();
    }

    public function test_cannot_invite_existing_account_email(): void
    {
        $owner = $this->createTeamOwner();
        User::factory()->create(['email' => 'existing@example.com']);

        $this->actingAs($owner)
            ->post(route('team-invites.store', $owner->team), [
                'email' => 'existing@example.com',
            ])
            ->assertSessionHasErrors('email');
    }

    public function test_settings_slug_is_reserved(): void
    {
        $owner = $this->createTeamOwner();

        $this->actingAs($owner)
            ->patch(route('team-settings.update', $owner->team), [
                'name' => $owner->team->name,
                'slug' => 'settings',
            ])
            ->assertSessionHasErrors('slug');
    }

    public function test_member_can_create_api_token_from_team_settings(): void
    {
        $owner = $this->createTeamOwner();
        $member = User::factory()->for($owner->team)->create();

        $this->actingAs($member)
            ->post(route('api-tokens.store', $member->team), [
                'name' => 'Local integration',
                'ability' => 'planner:read',
            ])
            ->assertRedirect(route('team-settings.section', [$member->team, 'api-tokens']))
            ->assertSessionHas('status', 'api-token-created')
            ->assertSessionHas('api_token_plain_text');

        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_type' => User::class,
            'tokenable_id' => $member->id,
            'name' => 'Local integration',
            'abilities' => '["planner:read"]',
        ]);
    }

    public function test_member_can_revoke_their_own_api_token(): void
    {
        $owner = $this->createTeamOwner();
        $member = User::factory()->for($owner->team)->create();
        $token = $member->createToken('Old token');

        $this->actingAs($member)
            ->delete(route('api-tokens.destroy', [$member->team, $token->accessToken]))
            ->assertRedirect(route('team-settings.section', [$member->team, 'api-tokens']))
            ->assertSessionHas('status', 'api-token-revoked');

        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $token->accessToken->id,
        ]);
    }

    public function test_member_cannot_revoke_another_users_api_token(): void
    {
        $owner = $this->createTeamOwner();
        $member = User::factory()->for($owner->team)->create();
        $token = $owner->createToken('Owner token');

        $this->actingAs($member)
            ->delete(route('api-tokens.destroy', [$member->team, $token->accessToken]))
            ->assertNotFound();

        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $token->accessToken->id,
        ]);
    }

    protected function createTeamOwner(): User
    {
        $team = Team::factory()->create(['slug' => 'test-team', 'name' => 'Test Team']);
        $owner = User::factory()->for($team)->create();
        $team->update(['owner_user_id' => $owner->id]);

        return $owner->fresh(['team']);
    }
}
