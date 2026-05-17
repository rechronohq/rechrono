<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HomeRedirectTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_home_redirects_to_login(): void
    {
        $response = $this->get('/');

        $response->assertRedirect(route('login', absolute: false));
    }

    public function test_authenticated_home_redirects_to_team_planner(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/');

        $response->assertRedirect(route('planner', $user->team, absolute: false));
    }
}
