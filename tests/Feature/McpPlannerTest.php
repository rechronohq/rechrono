<?php

namespace Tests\Feature;

use App\Mcp\Tools\ArchiveProject;
use App\Mcp\Tools\CompleteTask;
use App\Mcp\Tools\CreateProject;
use App\Mcp\Tools\CreateTask;
use App\Mcp\Tools\ListClients;
use App\Mcp\Tools\ListMembers;
use App\Mcp\Tools\ListProjects;
use App\Mcp\Tools\ListTasks;
use App\Mcp\Tools\ReadProject;
use App\Mcp\Tools\ReorderTask;
use App\Mcp\Tools\UnarchiveProject;
use App\Mcp\Tools\UpdateProject;
use App\Mcp\Tools\UpdateTask;
use App\Models\Client;
use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Laravel\Mcp\Request;
use Laravel\Sanctum\Sanctum;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class McpPlannerTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_post_to_mcp_endpoint(): void
    {
        $this
            ->postJson('/mcp/planner', [
                'jsonrpc' => '2.0',
                'id' => 1,
                'method' => 'tools/list',
            ])
            ->assertUnauthorized();
    }

    public function test_read_token_lists_only_read_tools(): void
    {
        $team = Team::factory()->create(['slug' => 'mcp-team']);
        $user = User::factory()->for($team)->create();
        $token = $user->createToken('MCP read token', ['planner:read'])->plainTextToken;

        $response = $this
            ->withToken($token)
            ->postJson('/mcp/planner', [
                'jsonrpc' => '2.0',
                'id' => 1,
                'method' => 'tools/list',
            ])
            ->assertOk();

        $toolNames = collect($response->json('result.tools'))->pluck('name');

        $this->assertContains('list-projects', $toolNames);
        $this->assertContains('list-tasks', $toolNames);
        $this->assertContains('read-project', $toolNames);
        $this->assertContains('list-members', $toolNames);
        $this->assertContains('list-clients', $toolNames);
        $this->assertNotContains('create-project', $toolNames);
        $this->assertNotContains('update-project', $toolNames);
        $this->assertNotContains('archive-project', $toolNames);
        $this->assertNotContains('unarchive-project', $toolNames);
        $this->assertNotContains('create-task', $toolNames);
        $this->assertNotContains('reorder-task', $toolNames);
        $this->assertNotContains('update-task', $toolNames);
        $this->assertNotContains('complete-task', $toolNames);
    }

    public function test_list_tools_return_only_requested_team_data(): void
    {
        [$team, $otherTeam, $user] = $this->teamFixture();

        Sanctum::actingAs($user, ['planner:read']);

        $projects = app(ListProjects::class)->handle(new Request([
            'team_slug' => $team->slug,
        ]));
        $tasks = app(ListTasks::class)->handle(new Request([
            'team_slug' => $team->slug,
        ]));

        $this->assertStringContainsString('MCP Visible Project', (string) $projects->content());
        $this->assertStringContainsString('MCP Visible Task', (string) $tasks->content());
        $this->assertStringNotContainsString('Other Team Project', (string) $projects->content());
        $this->assertStringNotContainsString('Other Team Task', (string) $tasks->content());
    }

    public function test_read_project_returns_requested_team_project_with_ordered_tasks(): void
    {
        [$team, $otherTeam, $user, $project] = $this->teamFixture();
        Task::factory()->create([
            'project_id' => $project->id,
            'name' => 'Later sorted task',
            'sort_order' => 20,
        ]);
        $firstTask = Task::factory()->create([
            'project_id' => $project->id,
            'name' => 'First sorted task',
            'sort_order' => 1,
        ]);
        $otherProject = Project::factory()->for($otherTeam)->create(['name' => 'Unreadable Other Project']);

        Sanctum::actingAs($user, ['planner:read']);

        $response = app(ReadProject::class)->handle(new Request([
            'team_slug' => $team->slug,
            'project_id' => $project->id,
        ]));

        $payload = json_decode((string) $response->content(), true, flags: JSON_THROW_ON_ERROR);

        $this->assertSame($project->id, $payload['project']['id']);
        $this->assertSame($firstTask->id, $payload['project']['tasks'][0]['id']);

        $this->expectException(ValidationException::class);

        app(ReadProject::class)->handle(new Request([
            'team_slug' => $team->slug,
            'project_id' => $otherProject->id,
        ]));
    }

    public function test_read_token_cannot_create_update_or_complete_tasks(): void
    {
        [$team, , $user, $project, $task] = $this->teamFixture();

        Sanctum::actingAs($user, ['planner:read']);

        $this->expectException(HttpException::class);

        app(CreateTask::class)->handle(new Request([
            'team_slug' => $team->slug,
            'project_id' => $project->id,
            'name' => 'Blocked MCP task',
            'start_date' => '2026-04-01',
            'end_date' => '2026-04-03',
        ]));
    }

    public function test_write_token_create_update_and_complete_tools_manage_team_tasks(): void
    {
        [$team, , $user, $project, $task] = $this->teamFixture();
        $parent = Task::factory()->create([
            'project_id' => $project->id,
            'name' => 'MCP parent task',
        ]);

        Sanctum::actingAs($user, ['planner:read', 'planner:write']);

        $createResponse = app(CreateTask::class)->handle(new Request([
            'team_slug' => $team->slug,
            'project_id' => $project->id,
            'parent_id' => $parent->id,
            'name' => 'MCP created task',
            'start_date' => '2026-04-01',
            'end_date' => '2026-04-03',
            'dependency_id' => $task->id,
            'assignee_user_id' => $user->id,
        ]));

        $this->assertStringContainsString('MCP created task', (string) $createResponse->content());
        $this->assertStringContainsString((string) $parent->id, (string) $createResponse->content());
        $this->assertStringContainsString($user->name, (string) $createResponse->content());

        $task = Task::query()->where('name', 'MCP created task')->firstOrFail();

        app(UpdateTask::class)->handle(new Request([
            'team_slug' => $team->slug,
            'task_id' => $task->id,
            'progress' => 65,
            'assignee_user_id' => null,
        ]));

        app(CompleteTask::class)->handle(new Request([
            'team_slug' => $team->slug,
            'task_id' => $task->id,
        ]));

        $task->refresh();

        $this->assertSame(100, $task->progress);
        $this->assertTrue($task->completed);
        $this->assertNull($task->assignee_user_id);
    }

    public function test_write_token_manages_project_lifecycle(): void
    {
        [$team, , $user] = $this->teamFixture();
        $client = Client::factory()->for($team)->create(['name' => 'MCP Client']);

        Sanctum::actingAs($user, ['planner:read', 'planner:write']);

        $response = app(CreateProject::class)->handle(new Request([
            'team_slug' => $team->slug,
            'name' => 'Agent-created project',
            'description' => 'Created through MCP',
            'client_id' => $client->id,
        ]));
        $payload = json_decode((string) $response->content(), true, flags: JSON_THROW_ON_ERROR);
        $project = Project::query()->findOrFail($payload['project']['id']);

        app(UpdateProject::class)->handle(new Request([
            'team_slug' => $team->slug,
            'project_id' => $project->id,
            'name' => 'Updated agent project',
        ]));
        app(ArchiveProject::class)->handle(new Request([
            'team_slug' => $team->slug,
            'project_id' => $project->id,
        ]));

        $this->assertSame('Updated agent project', $project->refresh()->name);
        $this->assertFalse($project->is_active);

        $archived = app(ListProjects::class)->handle(new Request([
            'team_slug' => $team->slug,
            'status' => 'archived',
        ]));
        $this->assertStringContainsString('Updated agent project', (string) $archived->content());

        app(UnarchiveProject::class)->handle(new Request([
            'team_slug' => $team->slug,
            'project_id' => $project->id,
        ]));

        $this->assertTrue($project->refresh()->is_active);
    }

    public function test_discovery_tools_return_only_team_members_and_clients(): void
    {
        [$team, $otherTeam, $user] = $this->teamFixture();
        Client::factory()->for($team)->create(['name' => 'Visible MCP Client']);
        Client::factory()->for($otherTeam)->create(['name' => 'Hidden MCP Client']);
        User::factory()->for($otherTeam)->create(['name' => 'Hidden MCP Member']);

        Sanctum::actingAs($user, ['planner:read']);

        $members = app(ListMembers::class)->handle(new Request(['team_slug' => $team->slug]));
        $clients = app(ListClients::class)->handle(new Request(['team_slug' => $team->slug]));

        $this->assertStringContainsString('MCP User', (string) $members->content());
        $this->assertStringNotContainsString('Hidden MCP Member', (string) $members->content());
        $this->assertStringContainsString('Visible MCP Client', (string) $clients->content());
        $this->assertStringNotContainsString('Hidden MCP Client', (string) $clients->content());
    }

    public function test_project_tools_reject_cross_team_references(): void
    {
        [$team, $otherTeam, $user] = $this->teamFixture();
        $otherClient = Client::factory()->for($otherTeam)->create();

        Sanctum::actingAs($user, ['planner:read', 'planner:write']);

        $this->expectException(ValidationException::class);

        app(CreateProject::class)->handle(new Request([
            'team_slug' => $team->slug,
            'name' => 'Invalid client project',
            'client_id' => $otherClient->id,
        ]));
    }

    public function test_write_token_can_reorder_project_tasks(): void
    {
        [$team, , $user, $project] = $this->teamFixture();
        $firstTask = Task::factory()->create([
            'project_id' => $project->id,
            'name' => 'First reorder task',
            'sort_order' => 1,
        ]);
        $secondTask = Task::factory()->create([
            'project_id' => $project->id,
            'name' => 'Second reorder task',
            'sort_order' => 2,
        ]);

        Sanctum::actingAs($user, ['planner:read', 'planner:write']);

        $response = app(ReorderTask::class)->handle(new Request([
            'team_slug' => $team->slug,
            'project_id' => $project->id,
            'task_id' => $secondTask->id,
            'target_task_id' => $firstTask->id,
            'position' => 'before',
        ]));

        $payload = json_decode((string) $response->content(), true, flags: JSON_THROW_ON_ERROR);

        $this->assertSame($secondTask->id, $payload['tasks'][0]['id']);
        $this->assertSame(1, $payload['tasks'][0]['sort_order']);
        $this->assertSame($firstTask->id, $payload['tasks'][1]['id']);
        $this->assertSame(2, $payload['tasks'][1]['sort_order']);
    }

    public function test_write_tools_reject_cross_team_references(): void
    {
        [$team, $otherTeam, $user, $project] = $this->teamFixture();
        $otherProject = Project::factory()->for($otherTeam)->create(['name' => 'Other Team Write Project']);
        $otherTask = Task::factory()->create([
            'project_id' => $otherProject->id,
            'name' => 'Other Team Write Task',
        ]);

        Sanctum::actingAs($user, ['planner:read', 'planner:write']);

        $this->expectException(ValidationException::class);

        app(CreateTask::class)->handle(new Request([
            'team_slug' => $team->slug,
            'project_id' => $project->id,
            'parent_id' => $otherTask->id,
            'name' => 'Invalid cross-team task',
            'start_date' => '2026-04-01',
            'end_date' => '2026-04-03',
        ]));
    }

    /**
     * @return array{0: Team, 1: Team, 2: User, 3: Project, 4: Task}
     */
    protected function teamFixture(): array
    {
        $team = Team::factory()->create(['slug' => 'mcp-team']);
        $otherTeam = Team::factory()->create(['slug' => 'other-mcp-team']);
        $user = User::factory()->for($team)->create(['name' => 'MCP User']);
        $project = Project::factory()->for($team)->create(['name' => 'MCP Visible Project']);
        $task = Task::factory()->create([
            'project_id' => $project->id,
            'name' => 'MCP Visible Task',
            'start_date' => '2026-03-01',
            'end_date' => '2026-03-02',
            'sort_order' => 10,
        ]);
        $otherProject = Project::factory()->for($otherTeam)->create(['name' => 'Other Team Project']);
        Task::factory()->create([
            'project_id' => $otherProject->id,
            'name' => 'Other Team Task',
            'start_date' => '2026-03-01',
            'end_date' => '2026-03-02',
        ]);

        return [$team, $otherTeam, $user, $project, $task];
    }
}
