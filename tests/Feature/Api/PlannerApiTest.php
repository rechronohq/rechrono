<?php

namespace Tests\Feature\Api;

use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PlannerApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_read_projects(): void
    {
        $team = Team::factory()->create();

        $this->getJson(route('api.projects.index', $team))
            ->assertUnauthorized();
    }

    public function test_user_can_list_team_projects(): void
    {
        $team = Team::factory()->create(['slug' => 'api-team']);
        $user = User::factory()->for($team)->create();
        $visibleProject = Project::factory()->for($team)->create(['name' => 'Visible API Project']);
        Project::factory()->for($team)->create([
            'name' => 'Archived API Project',
            'is_active' => false,
        ]);

        Sanctum::actingAs($user);

        $this
            ->getJson(route('api.projects.index', $team))
            ->assertOk()
            ->assertJsonPath('data.0.id', $visibleProject->id)
            ->assertJsonMissingPath('data.1');
    }

    public function test_user_can_read_project_with_ordered_tasks(): void
    {
        $team = Team::factory()->create(['slug' => 'api-team']);
        $user = User::factory()->for($team)->create();
        $project = Project::factory()->for($team)->create(['name' => 'API Project']);
        Task::factory()->create([
            'project_id' => $project->id,
            'name' => 'Second task',
            'sort_order' => 2,
        ]);
        $firstTask = Task::factory()->create([
            'project_id' => $project->id,
            'name' => 'First task',
            'sort_order' => 1,
        ]);

        Sanctum::actingAs($user);

        $this
            ->getJson(route('api.projects.show', [$team, $project]))
            ->assertOk()
            ->assertJsonPath('data.id', $project->id)
            ->assertJsonPath('data.tasks.0.id', $firstTask->id);
    }

    public function test_user_can_create_update_and_delete_project(): void
    {
        $team = Team::factory()->create(['slug' => 'api-team']);
        $user = User::factory()->for($team)->create();
        Sanctum::actingAs($user);

        $createResponse = $this
            ->postJson(route('api.projects.store', $team), [
                'name' => 'API-created project',
                'description' => 'Created by a token client.',
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'API-created project')
            ->assertJsonPath('data.description', 'Created by a token client.');

        $project = Project::query()->findOrFail($createResponse->json('data.id'));

        $this
            ->patchJson(route('api.projects.update', [$team, $project]), [
                'name' => 'Updated API project',
                'description' => 'Updated by a token client.',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Updated API project')
            ->assertJsonPath('data.description', 'Updated by a token client.');

        $this
            ->deleteJson(route('api.projects.destroy', [$team, $project]))
            ->assertNoContent();

        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
    }

    public function test_user_cannot_read_another_team_project(): void
    {
        $firstTeam = Team::factory()->create(['slug' => 'first-api-team']);
        $secondTeam = Team::factory()->create(['slug' => 'second-api-team']);
        $user = User::factory()->for($firstTeam)->create();
        $secondProject = Project::factory()->for($secondTeam)->create();

        Sanctum::actingAs($user);

        $this
            ->getJson(route('api.projects.show', [$secondTeam, $secondProject]))
            ->assertNotFound();
    }

    public function test_user_can_create_update_and_delete_project_task(): void
    {
        $team = Team::factory()->create(['slug' => 'api-team']);
        $user = User::factory()->for($team)->create();
        $project = Project::factory()->for($team)->create();

        Sanctum::actingAs($user);

        $createResponse = $this
            ->postJson(route('api.projects.tasks.store', [$team, $project]), [
                'name' => 'API task',
                'start_date' => '2026-05-20',
                'end_date' => '2026-05-22',
                'assignee_user_id' => $user->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'API task')
            ->assertJsonPath('data.assignee_user_id', $user->id);

        $task = Task::query()->findOrFail($createResponse->json('data.id'));

        $this
            ->patchJson(route('api.projects.tasks.update', [$team, $project, $task]), [
                'completed' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.completed', true)
            ->assertJsonPath('data.progress', 100);

        $this
            ->deleteJson(route('api.projects.tasks.destroy', [$team, $project, $task]))
            ->assertNoContent();

        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
    }
}
