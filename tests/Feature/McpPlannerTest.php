<?php

namespace Tests\Feature;

use App\Mcp\Tools\CompleteTask;
use App\Mcp\Tools\CreateTask;
use App\Mcp\Tools\ListProjects;
use App\Mcp\Tools\ListTasks;
use App\Mcp\Tools\UpdateTask;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Mcp\Request;
use Tests\TestCase;

class McpPlannerTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DemoDataSeeder::class);

        $this->admin = User::factory()->admin()->create();
    }

    public function test_list_tools_return_seeded_planning_data(): void
    {
        $projects = app(ListProjects::class)->handle(new Request);
        $tasks = app(ListTasks::class)->handle(new Request);

        $this->assertStringContainsString('Default Planning Board', (string) $projects->content());
        $this->assertStringContainsString('Kickoff and scope', (string) $tasks->content());
    }

    public function test_create_update_and_complete_tools_manage_tasks(): void
    {
        $project = Project::query()->firstOrFail();
        $dependency = Task::query()->where('project_id', $project->id)->firstOrFail();
        $parent = Task::query()->where('project_id', $project->id)->whereNull('parent_id')->firstOrFail();
        $assignee = $this->admin;

        $createResponse = app(CreateTask::class)->handle(new Request([
            'project_id' => $project->id,
            'parent_id' => $parent->id,
            'name' => 'MCP created task',
            'start_date' => '2026-04-01',
            'end_date' => '2026-04-03',
            'progress' => 15,
            'dependency_id' => $dependency->id,
            'assignee_user_id' => $assignee->id,
        ]));

        $this->assertStringContainsString('MCP created task', (string) $createResponse->content());
        $this->assertStringContainsString((string) $parent->id, (string) $createResponse->content());
        $this->assertStringContainsString($assignee->name, (string) $createResponse->content());

        $task = Task::query()->where('name', 'MCP created task')->firstOrFail();

        app(UpdateTask::class)->handle(new Request([
            'task_id' => $task->id,
            'progress' => 65,
            'assignee_user_id' => null,
        ]));

        app(CompleteTask::class)->handle(new Request([
            'task_id' => $task->id,
        ]));

        $task->refresh();

        $this->assertSame(100, $task->progress);
        $this->assertTrue($task->completed);
        $this->assertNull($task->assignee_user_id);
    }
}
