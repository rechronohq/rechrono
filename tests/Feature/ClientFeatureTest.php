<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientContact;
use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use App\Services\ProjectService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ClientFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_clients_and_contacts_are_team_scoped_entities(): void
    {
        $team = Team::factory()->create();
        $client = Client::factory()->for($team)->create([
            'name' => 'Acme',
            'address' => "123 Main Street\nToronto, ON",
        ]);
        $contact = ClientContact::factory()->for($client)->create([
            'name' => 'Sam Lee',
            'email' => 'sam@example.com',
            'job_title' => 'Producer',
        ]);

        $this->assertTrue(Schema::hasColumns('clients', ['team_id', 'name', 'address', 'is_active']));
        $this->assertTrue(Schema::hasColumns('client_contacts', ['client_id', 'name', 'email', 'job_title']));
        $this->assertSame($team->id, $client->team->id);
        $this->assertSame($client->id, $contact->client->id);
    }

    public function test_client_crud_contacts_archiving_and_guarded_deletion(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->for($user->team)->create();
        $project = Project::factory()->for($user->team)->create(['client_id' => $client->id]);

        $this->actingAs($user)
            ->postJson(route('client-contacts.store', [$user->team, $client]), [
                'name' => 'Taylor',
                'email' => 'taylor@example.com',
                'job_title' => 'Director',
            ])
            ->assertCreated();

        $this->actingAs($user)
            ->patchJson(route('clients.update', [$user->team, $client]), [
                'name' => 'Updated Client',
                'address' => 'Updated address',
                'is_active' => false,
            ])
            ->assertOk();

        $this->actingAs($user)
            ->deleteJson(route('clients.destroy', [$user->team, $client]))
            ->assertStatus(422);

        $project->update(['client_id' => null]);

        $this->actingAs($user)
            ->deleteJson(route('clients.destroy', [$user->team, $client]))
            ->assertNoContent();

        $this->assertDatabaseMissing('clients', ['id' => $client->id]);
        $this->assertDatabaseMissing('client_contacts', ['email' => 'taylor@example.com']);
    }

    public function test_clients_and_contacts_cannot_cross_team_boundaries(): void
    {
        $user = User::factory()->create();
        $otherTeam = Team::factory()->create();
        $otherClient = Client::factory()->for($otherTeam)->create();

        $this->actingAs($user)
            ->postJson(route('client-contacts.store', [$user->team, $otherClient]), ['name' => 'Invalid'])
            ->assertNotFound();

        $this->actingAs($user)
            ->postJson(route('projects.store', $user->team), [
                'name' => 'Invalid ownership',
                'client_id' => $otherClient->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('client_id');
    }

    public function test_project_client_is_stored_on_roots_and_inherited_by_subprojects(): void
    {
        $team = Team::factory()->create();
        $client = Client::factory()->for($team)->create();
        $service = app(ProjectService::class);

        $root = $service->create($team, ['name' => 'Root', 'client_id' => $client->id]);
        $child = $service->create($team, [
            'name' => 'Child',
            'parent_id' => $root->id,
            'client_id' => $client->id,
        ]);

        $this->assertNull($child->client_id);
        $this->assertSame($client->id, $child->effectiveClient()?->id);

        $detached = $service->update($team, $child, [
            'name' => 'Child',
            'parent_id' => null,
        ]);

        $this->assertSame($client->id, $detached->client_id);

        $newParent = $service->create($team, ['name' => 'New parent']);
        $nested = $service->update($team, $detached, [
            'name' => 'Child',
            'parent_id' => $newParent->id,
            'client_id' => $client->id,
        ]);

        $this->assertNull($nested->client_id);
        $this->assertNull($nested->effectiveClient());
    }

    public function test_http_endpoints_reject_direct_client_assignment_for_subprojects(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->for($user->team)->create();
        $parent = Project::factory()->for($user->team)->create();
        $child = Project::factory()->for($user->team)->create(['parent_id' => $parent->id]);
        $template = Project::factory()->for($user->team)->create(['is_template' => true]);

        $this->actingAs($user)
            ->postJson(route('projects.store', $user->team), [
                'name' => 'Invalid child',
                'parent_id' => $parent->id,
                'client_id' => $client->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('client_id');

        $this->actingAs($user)
            ->patchJson(route('projects.update', [$user->team, $child]), [
                'name' => $child->name,
                'parent_id' => $parent->id,
                'client_id' => $client->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('client_id');

        $this->actingAs($user)
            ->postJson(route('projects.from-template', $user->team), [
                'name' => 'Invalid template child',
                'template_project_id' => $template->id,
                'parent_id' => $parent->id,
                'client_id' => $client->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('client_id');
    }

    public function test_templates_clear_clients_and_duplicates_retain_root_clients(): void
    {
        $team = Team::factory()->create();
        $client = Client::factory()->for($team)->create();
        $service = app(ProjectService::class);
        $project = $service->create($team, ['name' => 'Client project', 'client_id' => $client->id]);

        $duplicate = $service->duplicate($project);
        $template = $service->saveAsTemplate($team, $project);
        $fromTemplate = $service->createFromTemplate($team, [
            'name' => 'From template',
            'template_project_id' => $template->id,
            'client_id' => $client->id,
        ]);

        $this->assertSame($client->id, $duplicate->client_id);
        $this->assertNull($template->client_id);
        $this->assertSame($client->id, $fromTemplate->client_id);
    }

    public function test_bulk_parent_changes_apply_client_inheritance_rules(): void
    {
        $team = Team::factory()->create();
        $client = Client::factory()->for($team)->create();
        $service = app(ProjectService::class);
        $root = $service->create($team, ['name' => 'Root', 'client_id' => $client->id]);
        $child = $service->create($team, ['name' => 'Child', 'parent_id' => $root->id]);
        $internalRoot = $service->create($team, ['name' => 'Internal root']);

        $service->bulkAction($team, [
            'action' => 'change-parent',
            'project_ids' => [$child->id],
            'parent_id' => null,
        ]);

        $this->assertSame($client->id, $child->fresh()->client_id);

        $service->bulkAction($team, [
            'action' => 'change-parent',
            'project_ids' => [$child->id],
            'parent_id' => $internalRoot->id,
        ]);

        $this->assertNull($child->fresh()->client_id);
        $this->assertNull($child->fresh()->effectiveClient());
    }
}
