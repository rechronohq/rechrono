<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TeamWorkspaceTest extends TestCase
{
    use RefreshDatabase;

    public function test_team_slug_prefix_scopes_planner_projects_and_assignees(): void
    {
        $firstTeam = Team::factory()->create(['slug' => 'first-team']);
        $secondTeam = Team::factory()->create(['slug' => 'second-team']);
        $firstUser = User::factory()->for($firstTeam)->create(['name' => 'First User']);
        $secondUser = User::factory()->for($secondTeam)->create(['name' => 'Second User']);
        $firstProject = Project::factory()->for($firstTeam)->create(['name' => 'First Team Project']);
        $secondProject = Project::factory()->for($secondTeam)->create(['name' => 'Second Team Project']);

        Task::factory()->create([
            'project_id' => $firstProject->id,
            'name' => 'First Team Task',
            'assignee_user_id' => $firstUser->id,
        ]);
        Task::factory()->create([
            'project_id' => $secondProject->id,
            'name' => 'Second Team Task',
            'assignee_user_id' => $secondUser->id,
        ]);

        $this->actingAs($firstUser)
            ->get(route('planner', $firstTeam))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tasks/Index')
                ->where('auth.team.slug', 'first-team')
                ->where('timelineData.projects.0.name', 'First Team Project')
                ->where('timelineData.items.0.name', 'First Team Task')
                ->where('timelineData.assignee_options.1.label', 'First User')
            );

        $this->actingAs($firstUser)
            ->get(route('planner', $secondTeam))
            ->assertNotFound();
    }

    public function test_scoped_bindings_prevent_cross_team_project_and_task_access(): void
    {
        $firstTeam = Team::factory()->create(['slug' => 'first-team']);
        $secondTeam = Team::factory()->create(['slug' => 'second-team']);
        $firstUser = User::factory()->for($firstTeam)->create();
        $secondProject = Project::factory()->for($secondTeam)->create();
        $secondTask = Task::factory()->create(['project_id' => $secondProject->id]);

        $this->actingAs($firstUser)
            ->get(route('projects.show', [$firstTeam, $secondProject]))
            ->assertNotFound();

        $this->actingAs($firstUser)
            ->patchJson(route('projects.tasks.update', [$firstTeam, $secondProject, $secondTask]), [
                'completed' => true,
            ])
            ->assertNotFound();
    }
}
