<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\TimelineView;
use App\Models\User;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PlannerTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeded_rechrono_schema_excludes_nomia_modules(): void
    {
        $this->seed(DemoDataSeeder::class);

        $this->assertTrue(Schema::hasTable('projects'));
        $this->assertTrue(Schema::hasTable('tasks'));
        $this->assertTrue(Schema::hasColumns('projects', ['name', 'description', 'parent_id', 'is_template', 'is_active']));
        $this->assertTrue(Schema::hasColumns('tasks', ['assignee_user_id']));
        $this->assertFalse(Schema::hasColumn('tasks', 'assignee_type'));

        foreach (['clients', 'invoices', 'billable_items', 'company_profiles'] as $table) {
            $this->assertFalse(Schema::hasTable($table));
        }

        $this->assertTrue(Schema::hasTable('time_entries'));

        $this->assertTrue(Route::has('planner'));
        $this->assertTrue(Route::has('projects.index'));
        $this->assertTrue(Route::has('timesheet.index'));
        $this->assertFalse(Route::has('clients.index'));
        $this->assertFalse(Route::has('timesheets'));
        $this->assertFalse(Route::has('invoices.index'));

        $this->assertDatabaseHas('projects', ['name' => 'Demo Workspace']);
    }

    public function test_authenticated_user_can_view_planner_and_projects_without_nomia_navigation(): void
    {
        $user = $this->seedPlannerDemo();

        $this->actingAs($user)
            ->get(route('planner', $user->team))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tasks/Index')
                ->where('routes.apps.planner', route('planner', $user->team))
                ->where('routes.apps.projects', route('projects.index', $user->team))
                ->missing('routes.apps.clients')
                ->missing('routes.apps.timesheets')
                ->missing('routes.apps.invoices')
                ->has('timelineData.projects')
                ->has('timelineData.assignee_options'));

        $this->actingAs($user)
            ->get(route('projects.index', $user->team))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Projects/Index')
                ->has('projects.rows')
                ->missing('projects.rows.0.client')
                ->missing('projects.rows.0.budget'));
    }

    public function test_project_and_task_crud_use_planner_fields_only(): void
    {
        $user = $this->seedPlannerDemo();

        $projectResponse = $this->actingAs($user)
            ->postJson(route('projects.store', $user->team), [
                'name' => 'Open source launch plan',
                'description' => 'Planner-only project description.',
            ])
            ->assertOk();

        $project = Project::query()->where('name', 'Open source launch plan')->firstOrFail();

        $this->assertSame('Planner-only project description.', $project->description);
        $this->assertArrayHasKey('project', $projectResponse->json());

        $taskResponse = $this->actingAs($user)
            ->postJson(route('projects.tasks.store', [$user->team, $project]), [
                'name' => 'Prepare release notes',
                'start_date' => '2026-05-12',
                'end_date' => '2026-05-14',
                'assignee_user_id' => $user->id,
            ])
            ->assertOk();

        $task = Task::query()->where('name', 'Prepare release notes')->firstOrFail();

        $this->assertSame($user->id, $task->assignee_user_id);
        $this->assertArrayHasKey('items', $taskResponse->json());

        $this->actingAs($user)
            ->patchJson(route('projects.tasks.update', [$user->team, $project, $task]), [
                'completed' => true,
            ])
            ->assertOk();

        $this->assertTrue($task->fresh()->completed);
        $this->assertSame(100, $task->fresh()->progress);
    }

    public function test_timeline_parent_task_dates_are_derived_from_nested_tasks(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user->team)->create(['name' => 'Nested timeline project']);
        $parent = Task::factory()->for($project)->create([
            'name' => 'Parent task',
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-30',
            'sort_order' => 1,
        ]);
        Task::factory()->for($project)->create([
            'name' => 'Later child',
            'parent_id' => $parent->id,
            'start_date' => '2026-06-10',
            'end_date' => '2026-06-12',
            'sort_order' => 2,
        ]);
        Task::factory()->for($project)->create([
            'name' => 'Earlier child',
            'parent_id' => $parent->id,
            'start_date' => '2026-06-04',
            'end_date' => '2026-06-05',
            'sort_order' => 1,
        ]);

        $this->actingAs($user)
            ->getJson(route('tasks.data', $user->team))
            ->assertOk()
            ->assertJsonPath('items.0.name', 'Parent task')
            ->assertJsonPath('items.0.start', '2026-06-04')
            ->assertJsonPath('items.0.end', '2026-06-12')
            ->assertJsonPath('items.0.has_children', true);
    }

    public function test_moving_parent_task_shifts_nested_tasks_from_derived_start_date(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user->team)->create(['name' => 'Nested drag project']);
        $parent = Task::factory()->for($project)->create([
            'name' => 'Parent task',
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-30',
            'sort_order' => 1,
        ]);
        $earlierChild = Task::factory()->for($project)->create([
            'name' => 'Earlier child',
            'parent_id' => $parent->id,
            'start_date' => '2026-06-04',
            'end_date' => '2026-06-05',
            'sort_order' => 1,
        ]);
        $laterChild = Task::factory()->for($project)->create([
            'name' => 'Later child',
            'parent_id' => $parent->id,
            'start_date' => '2026-06-10',
            'end_date' => '2026-06-12',
            'sort_order' => 2,
        ]);

        $this->actingAs($user)
            ->patchJson(route('projects.tasks.update', [$user->team, $project, $parent]), [
                'start_date' => '2026-06-11',
                'end_date' => '2026-06-19',
                'interaction' => 'move',
                'selected_project_ids' => [$project->id],
            ])
            ->assertOk()
            ->assertJsonPath('items.0.start', '2026-06-11')
            ->assertJsonPath('items.0.end', '2026-06-19');

        $this->assertSame('2026-06-11', $earlierChild->fresh()->start_date->toDateString());
        $this->assertSame('2026-06-12', $earlierChild->fresh()->end_date->toDateString());
        $this->assertSame('2026-06-17', $laterChild->fresh()->start_date->toDateString());
        $this->assertSame('2026-06-19', $laterChild->fresh()->end_date->toDateString());
    }

    public function test_moving_parent_task_across_hidden_weekend_shifts_children_by_visible_days(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user->team)->create(['name' => 'Weekend drag project']);
        $parent = Task::factory()->for($project)->create([
            'name' => 'Parent task',
            'start_date' => '2026-06-05',
            'end_date' => '2026-06-08',
            'sort_order' => 1,
        ]);
        $fridayChild = Task::factory()->for($project)->create([
            'name' => 'Friday child',
            'parent_id' => $parent->id,
            'start_date' => '2026-06-05',
            'end_date' => '2026-06-05',
            'sort_order' => 1,
        ]);
        $mondayChild = Task::factory()->for($project)->create([
            'name' => 'Monday child',
            'parent_id' => $parent->id,
            'start_date' => '2026-06-08',
            'end_date' => '2026-06-08',
            'sort_order' => 2,
        ]);

        $this->actingAs($user)
            ->patchJson(route('projects.tasks.update', [$user->team, $project, $parent]), [
                'start_date' => '2026-06-08',
                'end_date' => '2026-06-09',
                'interaction' => 'move',
                'timeline_delta_days' => 1,
                'show_weekends' => false,
                'selected_project_ids' => [$project->id],
            ])
            ->assertOk()
            ->assertJsonPath('items.0.start', '2026-06-08')
            ->assertJsonPath('items.0.end', '2026-06-09');

        $this->assertSame('2026-06-08', $fridayChild->fresh()->start_date->toDateString());
        $this->assertSame('2026-06-08', $fridayChild->fresh()->end_date->toDateString());
        $this->assertSame('2026-06-09', $mondayChild->fresh()->start_date->toDateString());
        $this->assertSame('2026-06-09', $mondayChild->fresh()->end_date->toDateString());
    }

    public function test_bulk_project_action_can_change_parent_for_multiple_projects(): void
    {
        $user = $this->seedPlannerDemo();
        $parent = Project::factory()->create(['name' => 'Parent board']);
        $firstProject = Project::factory()->create(['name' => 'First movable board']);
        $secondProject = Project::factory()->create(['name' => 'Second movable board']);

        $this->actingAs($user)
            ->postJson(route('projects.bulk-action', $user->team), [
                'action' => 'change-parent',
                'parent_id' => $parent->id,
                'project_ids' => [$firstProject->id, $secondProject->id],
            ])
            ->assertOk();

        $this->assertSame($parent->id, $firstProject->fresh()->parent_id);
        $this->assertSame($parent->id, $secondProject->fresh()->parent_id);

        $this->actingAs($user)
            ->postJson(route('projects.bulk-action', $user->team), [
                'action' => 'change-parent',
                'parent_id' => null,
                'project_ids' => [$firstProject->id, $secondProject->id],
            ])
            ->assertOk();

        $this->assertNull($firstProject->fresh()->parent_id);
        $this->assertNull($secondProject->fresh()->parent_id);
    }

    public function test_bulk_project_action_can_delete_multiple_projects_and_tasks(): void
    {
        $user = $this->seedPlannerDemo();
        $firstProject = Project::factory()->create(['name' => 'First doomed board']);
        $secondProject = Project::factory()->create(['name' => 'Second doomed board']);
        $firstTask = Task::factory()->create(['project_id' => $firstProject->id]);
        $dependentTask = Task::factory()->create([
            'project_id' => $secondProject->id,
            'dependency_id' => $firstTask->id,
        ]);

        $this->actingAs($user)
            ->postJson(route('projects.bulk-action', $user->team), [
                'action' => 'delete',
                'project_ids' => [$firstProject->id, $secondProject->id],
            ])
            ->assertOk();

        $this->assertDatabaseMissing('projects', ['id' => $firstProject->id]);
        $this->assertDatabaseMissing('projects', ['id' => $secondProject->id]);
        $this->assertDatabaseMissing('tasks', ['id' => $firstTask->id]);
        $this->assertDatabaseMissing('tasks', ['id' => $dependentTask->id]);
    }

    public function test_project_detail_includes_tasks_grouped_by_assignee(): void
    {
        $viewer = $this->seedPlannerDemo();
        $assignee = User::factory()->create();
        $project = Project::factory()->create(['name' => 'Grouped task project']);

        Task::factory()->create([
            'project_id' => $project->id,
            'name' => 'Assigned project task',
            'assignee_user_id' => $assignee->id,
            'progress' => 35,
            'start_date' => '2026-05-20',
            'end_date' => '2026-05-22',
        ]);
        Task::factory()->create([
            'project_id' => $project->id,
            'name' => 'Unassigned project task',
            'assignee_user_id' => null,
            'progress' => 100,
            'start_date' => '2026-05-23',
            'end_date' => '2026-05-24',
        ]);
        Task::factory()->create([
            'name' => 'Other project task',
            'assignee_user_id' => $assignee->id,
        ]);

        $this->actingAs($viewer)
            ->get(route('projects.show', [$viewer->team, $project]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Projects/Show')
                ->where('project.task_summary.total', 2)
                ->where('project.task_summary.completed', 1)
                ->where('project.task_summary.open', 1)
                ->has('project.task_groups', 2)
                ->where('project.task_groups.0.assignee_name', $assignee->name)
                ->where('project.task_groups.0.tasks.0.name', 'Assigned project task')
                ->where('project.task_groups.0.tasks.0.update_url', route('projects.tasks.update', [$viewer->team, $project, Task::query()->where('name', 'Assigned project task')->firstOrFail()]))
                ->where('project.task_groups.1.assignee_name', 'Unassigned')
                ->where('project.task_groups.1.tasks.0.name', 'Unassigned project task'));
    }

    public function test_timeline_payload_contains_user_assignees_only(): void
    {
        $user = $this->seedPlannerDemo();
        $project = Project::factory()->create(['name' => 'Assignment plan']);
        Task::factory()->create([
            'project_id' => $project->id,
            'name' => 'User-owned work',
            'assignee_user_id' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->getJson(route('tasks.data', [$user->team, 'projects' => [$project->id]]))
            ->assertOk();

        $this->assertContains('Unassigned', collect($response->json('assignee_options'))->pluck('label'));
        $this->assertContains($user->name, collect($response->json('assignee_options'))->pluck('label'));
        $this->assertNotContains('Client', collect($response->json('assignee_options'))->pluck('label'));
        $this->assertSame($user->id, $response->json('items.0.assignee_user_id'));
        $this->assertArrayNotHasKey('assignee_type', $response->json('items.0'));
    }

    public function test_archived_projects_are_excluded_from_timeline_payloads(): void
    {
        $user = $this->seedPlannerDemo();
        $archivedProject = Project::factory()->create([
            'name' => 'Archived timeline board',
            'is_active' => false,
        ]);
        Task::factory()->create([
            'project_id' => $archivedProject->id,
            'name' => 'Archived timeline task',
        ]);

        $this->actingAs($user)
            ->get(route('planner', $user->team))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tasks/Index')
                ->whereNot('timelineData.projects.0.name', 'Archived timeline board'));

        $response = $this->actingAs($user)
            ->getJson(route('tasks.data', [$user->team, 'projects' => [$archivedProject->id]]))
            ->assertOk();

        $this->assertNotContains('Archived timeline board', collect($response->json('projects'))->pluck('name'));
        $this->assertNotContains('Archived timeline task', collect($response->json('items'))->pluck('name'));
    }

    public function test_user_can_create_rename_and_delete_personal_timeline_view(): void
    {
        $user = $this->seedPlannerDemo();
        $project = Project::query()->where('name', 'Example Project')->firstOrFail();

        $createResponse = $this->actingAs($user)
            ->postJson(route('timeline-views.store', $user->team), [
                'name' => 'Launch view',
                'project_ids' => [$project->id],
                'assignee_filters' => ['unassigned'],
                'show_weekends' => true,
                'timeline_density' => 'compact',
                'collapsed_project_ids' => [$project->id],
            ])
            ->assertCreated();

        $viewId = $createResponse->json('view.id');

        $this->assertDatabaseHas('timeline_views', [
            'id' => $viewId,
            'user_id' => $user->id,
            'name' => 'Launch view',
            'show_weekends' => true,
            'timeline_density' => 'compact',
        ]);

        $this->actingAs($user)
            ->patchJson(route('timeline-views.update', [$user->team, $viewId]), [
                'name' => 'Launch view renamed',
            ])
            ->assertOk();

        $this->assertDatabaseHas('timeline_views', [
            'id' => $viewId,
            'name' => 'Launch view renamed',
        ]);

        $this->actingAs($user)
            ->deleteJson(route('timeline-views.destroy', [$user->team, $viewId]))
            ->assertOk();

        $this->assertDatabaseMissing('timeline_views', ['id' => $viewId]);
    }

    public function test_timeline_views_are_private_to_their_owner(): void
    {
        $owner = $this->seedPlannerDemo();
        $otherUser = User::factory()->create();

        $viewId = $this->actingAs($owner)
            ->postJson(route('timeline-views.store', $owner->team), [
                'name' => 'Private view',
                'project_ids' => Project::query()->limit(1)->pluck('id')->all(),
                'assignee_filters' => ['unassigned'],
                'show_weekends' => false,
                'timeline_density' => 'comfortable',
                'collapsed_project_ids' => [],
            ])
            ->assertCreated()
            ->json('view.id');

        $this->actingAs($otherUser)
            ->get(route('timeline-views.show', [$otherUser->team, $viewId]))
            ->assertNotFound();

        $this->actingAs($otherUser)
            ->patchJson(route('timeline-views.update', [$otherUser->team, $viewId]), ['name' => 'Stolen'])
            ->assertNotFound();

        $this->actingAs($otherUser)
            ->deleteJson(route('timeline-views.destroy', [$otherUser->team, $viewId]))
            ->assertNotFound();
    }

    public function test_user_can_update_saved_timeline_view_settings_without_renaming_it(): void
    {
        $user = $this->seedPlannerDemo();
        $projects = Project::query()->limit(2)->get();

        $viewId = $this->actingAs($user)
            ->postJson(route('timeline-views.store', $user->team), [
                'name' => 'Persistent view',
                'project_ids' => [$projects[0]->id],
                'assignee_filters' => ['unassigned'],
                'show_weekends' => false,
                'timeline_density' => 'compact',
                'collapsed_project_ids' => [],
            ])
            ->assertCreated()
            ->json('view.id');

        $this->actingAs($user)
            ->patchJson(route('timeline-views.update', [$user->team, $viewId]), [
                'project_ids' => [$projects[1]->id],
                'assignee_filters' => ['user:1'],
                'show_weekends' => true,
                'timeline_density' => 'comfortable',
                'collapsed_project_ids' => [$projects[1]->id],
            ])
            ->assertOk()
            ->assertJsonPath('view.name', 'Persistent view');

        $this->assertDatabaseHas('timeline_views', [
            'id' => $viewId,
            'name' => 'Persistent view',
            'show_weekends' => true,
            'timeline_density' => 'comfortable',
        ]);

        $view = TimelineView::query()->findOrFail($viewId);

        $this->assertSame([$projects[1]->id], $view->project_ids);
        $this->assertSame(['user:1'], $view->assignee_filters);
        $this->assertSame([$projects[1]->id], $view->collapsed_project_ids);
    }

    public function test_saved_timeline_view_applies_normalized_settings(): void
    {
        $user = $this->seedPlannerDemo();
        $visibleProject = Project::query()->where('name', 'Example Project')->firstOrFail();
        $archivedProject = Project::factory()->create([
            'name' => 'Archived saved-view board',
            'is_active' => false,
        ]);

        $viewId = $this->actingAs($user)
            ->postJson(route('timeline-views.store', $user->team), [
                'name' => 'Normalized view',
                'project_ids' => [$visibleProject->id, $archivedProject->id],
                'assignee_filters' => ['unassigned', 'user:not-real'],
                'show_weekends' => true,
                'timeline_density' => 'compact',
                'collapsed_project_ids' => [$visibleProject->id, $archivedProject->id],
            ])
            ->assertCreated()
            ->json('view.id');

        $this->actingAs($user)
            ->get(route('timeline-views.show', [$user->team, $viewId]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tasks/Index')
                ->where('activeTimelineViewId', $viewId)
                ->where('timelineData.timeline_density', 'compact')
                ->where('timelineData.show_weekends', true)
                ->where('timelineData.selected_project_ids', [$visibleProject->id])
                ->where('timelineData.selected_assignee_filters', ['unassigned'])
                ->where('timelineData.collapsed_project_ids', [$visibleProject->id]));
    }
}
