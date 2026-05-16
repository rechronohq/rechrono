<?php

namespace Tests\Feature;

use Tests\TestCase;

class HomeRedirectTest extends TestCase
{
    public function test_home_redirects_to_planner(): void
    {
        $response = $this->get('/');

        $response->assertRedirect(route('planner', absolute: false));
    }
}
