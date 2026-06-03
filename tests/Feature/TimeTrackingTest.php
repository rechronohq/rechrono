<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TimeTrackingTest extends TestCase
{
    use RefreshDatabase;

    public function test_team_owner_can_enable_time_tracking_and_members_cannot(): void
    {
        $owner = $this->createTeamOwner();
        $member = User::factory()->for($owner->team)->create();

        $this->actingAs($member)
            ->patch(route('team-settings.update', $member->team), [
                'name' => $member->team->name,
                'slug' => $member->team->slug,
                'time_tracking_enabled' => true,
            ])
            ->assertForbidden();

        $this->actingAs($owner)
            ->patch(route('team-settings.update', $owner->team), [
                'name' => $owner->team->name,
                'slug' => $owner->team->slug,
                'time_tracking_enabled' => true,
            ])
            ->assertRedirect(route('team-settings.edit', $owner->team));

        $this->assertDatabaseHas('teams', [
            'id' => $owner->team_id,
            'time_tracking_enabled' => true,
        ]);
    }

    public function test_timesheet_navigation_and_shared_routes_are_hidden_until_enabled(): void
    {
        $owner = $this->createTeamOwner();

        $this->actingAs($owner)
            ->get(route('planner', $owner->team))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.team.time_tracking_enabled', false)
                ->missing('routes.apps.timesheet')
                ->missing('routes.time'));

        $owner->team->update(['time_tracking_enabled' => true]);

        $this->actingAs($owner)
            ->get(route('planner', $owner->team))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.team.time_tracking_enabled', true)
                ->where('routes.apps.timesheet', route('timesheet.index', $owner->team))
                ->where('routes.time.current', route('time.current', $owner->team)));
    }

    public function test_user_can_start_and_stop_one_task_timer(): void
    {
        CarbonImmutable::setTestNow('2026-05-28 09:00:00');
        $owner = $this->createTeamOwner(['time_tracking_enabled' => true]);
        $project = Project::factory()->for($owner->team)->create();
        $firstTask = Task::factory()->for($project)->create(['name' => 'First timed task']);
        $secondTask = Task::factory()->for($project)->create(['name' => 'Second timed task']);

        $this->actingAs($owner)
            ->postJson(route('time.timer.start', [$owner->team, $firstTask]))
            ->assertOk()
            ->assertJsonPath('entry.task_id', $firstTask->id)
            ->assertJsonPath('entry.is_running', true);

        CarbonImmutable::setTestNow('2026-05-28 09:45:00');

        $this->actingAs($owner)
            ->postJson(route('time.timer.start', [$owner->team, $secondTask]))
            ->assertOk()
            ->assertJsonPath('entry.task_id', $secondTask->id)
            ->assertJsonPath('entry.is_running', true);

        $this->assertDatabaseHas('time_entries', [
            'task_id' => $firstTask->id,
            'user_id' => $owner->id,
            'duration_seconds' => 2700,
        ]);

        CarbonImmutable::setTestNow('2026-05-28 10:15:00');

        $this->actingAs($owner)
            ->postJson(route('time.timer.stop', $owner->team))
            ->assertOk()
            ->assertJsonPath('entry.task_id', $secondTask->id)
            ->assertJsonPath('entry.duration_seconds', 1800);

        $this->assertSame(0, DB::table('time_entries')
            ->where('user_id', $owner->id)
            ->whereNull('ended_at')
            ->count());

        CarbonImmutable::setTestNow();
    }

    public function test_time_tracking_requires_enabled_team_and_team_task(): void
    {
        $owner = $this->createTeamOwner();
        $project = Project::factory()->for($owner->team)->create();
        $task = Task::factory()->for($project)->create();
        $otherOwner = $this->createTeamOwner(['slug' => 'other-team']);
        $otherProject = Project::factory()->for($otherOwner->team)->create();
        $otherTask = Task::factory()->for($otherProject)->create();

        $this->actingAs($owner)
            ->postJson(route('time.timer.start', [$owner->team, $task]))
            ->assertNotFound();

        $owner->team->update(['time_tracking_enabled' => true]);

        $this->actingAs($owner)
            ->postJson(route('time.timer.start', [$owner->team, $otherTask]))
            ->assertNotFound();
    }

    public function test_members_manage_their_entries_and_owner_views_team_timesheet(): void
    {
        $owner = $this->createTeamOwner(['time_tracking_enabled' => true]);
        $member = User::factory()->for($owner->team)->create(['name' => 'Member User']);
        $project = Project::factory()->for($owner->team)->create(['name' => 'Budgeted project']);
        $task = Task::factory()->for($project)->create(['name' => 'Tracked task']);

        $this->actingAs($member)
            ->postJson(route('time.entries.store', $member->team), [
                'task_id' => $task->id,
                'date' => '2026-05-26',
                'start_time' => '09:15',
                'end_time' => '10:45',
            ])
            ->assertCreated()
            ->assertJsonPath('entry.duration_seconds', 5400)
            ->assertJsonPath('entry.started_time', '09:15')
            ->assertJsonPath('entry.ended_time', '10:45');

        $this->assertDatabaseHas('time_entries', [
            'task_id' => $task->id,
            'user_id' => $member->id,
            'started_at' => '2026-05-26 09:15:00',
            'ended_at' => '2026-05-26 10:45:00',
            'duration_seconds' => 5400,
        ]);

        $entryId = DB::table('time_entries')->where('user_id', $member->id)->value('id');

        $this->actingAs($member)
            ->patchJson(route('time.entries.update', [$member->team, $entryId]), [
                'task_id' => $task->id,
                'date' => '2026-05-26',
                'start_time' => '10:00',
                'end_time' => '12:00',
            ])
            ->assertOk()
            ->assertJsonPath('entry.duration_seconds', 7200)
            ->assertJsonPath('entry.started_time', '10:00')
            ->assertJsonPath('entry.ended_time', '12:00');

        $this->actingAs($member)
            ->get(route('timesheet.index', [$member->team, 'date' => '2026-05-26', 'view' => 'day']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Timesheet/Index')
                ->where('timesheet.can_view_team', false)
                ->where('timesheet.view', 'day')
                ->where('timesheet.selected_date', '2026-05-26')
                ->where('timesheet.day_entries.0.task_name', 'Tracked task')
                ->where('timesheet.day_entries.0.started_time', '10:00')
                ->where('timesheet.day_entries.0.ended_time', '12:00')
                ->where('timesheet.day_entries.0.duration_hours', fn ($value): bool => (float) $value === 2.0)
                ->where('timesheet.rows.0.task_name', 'Tracked task')
                ->where('timesheet.rows.0.entries.2026-05-26.hours', fn ($value): bool => (float) $value === 2.0));

        $this->actingAs($owner)
            ->get(route('timesheet.index', [$owner->team, 'week' => '2026-05-25']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Timesheet/Index')
                ->where('timesheet.can_view_team', true)
                ->where('timesheet.rows.0.user_name', 'Member User')
                ->where('timesheet.totals.total_hours', fn ($value): bool => (float) $value === 2.0));
    }

    public function test_manual_entries_reject_end_times_that_are_not_after_start_times(): void
    {
        $owner = $this->createTeamOwner(['time_tracking_enabled' => true]);
        $project = Project::factory()->for($owner->team)->create();
        $task = Task::factory()->for($project)->create();

        $this->actingAs($owner)
            ->postJson(route('time.entries.store', $owner->team), [
                'task_id' => $task->id,
                'date' => '2026-05-26',
                'start_time' => '13:00',
                'end_time' => '12:59',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['end_time']);
    }

    public function test_project_budget_and_actual_time_are_exposed_when_enabled(): void
    {
        $owner = $this->createTeamOwner(['time_tracking_enabled' => true]);
        $project = Project::factory()->for($owner->team)->create([
            'name' => 'Budget report',
            'budget_hours' => 10,
        ]);
        $task = Task::factory()->for($project)->create();

        DB::table('time_entries')->insert([
            'id' => (string) Str::uuid(),
            'team_id' => $owner->team_id,
            'project_id' => $project->id,
            'task_id' => $task->id,
            'user_id' => $owner->id,
            'started_at' => '2026-05-26 09:00:00',
            'ended_at' => '2026-05-26 11:30:00',
            'duration_seconds' => 9000,
            'notes' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($owner)
            ->get(route('planner', $owner->team))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('timelineData.projects.0.budget_hours', fn ($value): bool => (float) $value === 10.0)
                ->where('timelineData.projects.0.actual_hours', 2.5));
    }

    protected function createTeamOwner(array $teamAttributes = []): User
    {
        $team = Team::factory()->create([
            'slug' => $teamAttributes['slug'] ?? 'test-team',
            'name' => $teamAttributes['name'] ?? 'Test Team',
            'time_tracking_enabled' => $teamAttributes['time_tracking_enabled'] ?? false,
        ]);
        $owner = User::factory()->for($team)->create();
        $team->update(['owner_user_id' => $owner->id]);

        return $owner->fresh(['team']);
    }
}
