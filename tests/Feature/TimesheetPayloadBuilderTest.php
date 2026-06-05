<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\TimeEntry;
use App\Models\User;
use App\Support\TimesheetPayloadBuilder;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class TimesheetPayloadBuilderTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_groups_week_rows_and_totals_for_team_owner(): void
    {
        CarbonImmutable::setTestNow('2026-06-03 13:00:00');
        [$team, $owner, $member, $task] = $this->seedTimedTask();

        TimeEntry::factory()->create([
            'team_id' => $team->id,
            'project_id' => $task->project_id,
            'task_id' => $task->id,
            'user_id' => $member->id,
            'started_at' => '2026-06-01 09:00:00',
            'ended_at' => '2026-06-01 10:00:00',
            'duration_seconds' => 3600,
        ]);
        TimeEntry::factory()->create([
            'team_id' => $team->id,
            'project_id' => $task->project_id,
            'task_id' => $task->id,
            'user_id' => $member->id,
            'started_at' => '2026-06-01 14:00:00',
            'ended_at' => '2026-06-01 14:30:00',
            'duration_seconds' => 1800,
        ]);
        TimeEntry::factory()->create([
            'team_id' => $team->id,
            'project_id' => $task->project_id,
            'task_id' => $task->id,
            'user_id' => $owner->id,
            'started_at' => '2026-06-02 12:00:00',
            'ended_at' => null,
            'duration_seconds' => 0,
        ]);

        $payload = app(TimesheetPayloadBuilder::class)->build(
            Request::create('/timesheet', 'GET', ['view' => 'week', 'week' => '2026-06-01']),
            $team,
            $owner,
        );

        $this->assertTrue($payload['can_view_team']);
        $this->assertSame('week', $payload['view']);
        $this->assertSame('2026-06-01', $payload['week_start']);
        $this->assertCount(2, $payload['rows']);
        $this->assertSame(1.5, $payload['totals']['days']['2026-06-01']);
        $this->assertSame(25.0, $payload['totals']['days']['2026-06-02']);
        $this->assertSame(26.5, $payload['totals']['total_hours']);

        $memberRow = collect($payload['rows'])->firstWhere('user_id', $member->id);

        $this->assertSame('Tracked task', $memberRow['task_name']);
        $this->assertSame(1.5, $memberRow['entries']['2026-06-01']['hours']);
        $this->assertSame(1.5, $memberRow['total_hours']);

        CarbonImmutable::setTestNow();
    }

    public function test_it_scopes_payload_to_member_entries_and_marks_editable_rows(): void
    {
        CarbonImmutable::setTestNow('2026-06-04 07:30:00');
        [$team, $owner, $member, $task] = $this->seedTimedTask();

        TimeEntry::factory()->create([
            'team_id' => $team->id,
            'project_id' => $task->project_id,
            'task_id' => $task->id,
            'user_id' => $owner->id,
            'started_at' => '2026-06-01 09:00:00',
            'ended_at' => '2026-06-01 10:00:00',
            'duration_seconds' => 3600,
        ]);
        TimeEntry::factory()->create([
            'team_id' => $team->id,
            'project_id' => $task->project_id,
            'task_id' => $task->id,
            'user_id' => $member->id,
            'started_at' => '2026-06-01 11:00:00',
            'ended_at' => '2026-06-01 12:00:00',
            'duration_seconds' => 3600,
        ]);

        $payload = app(TimesheetPayloadBuilder::class)->build(
            Request::create('/timesheet', 'GET', ['view' => 'day', 'date' => '2026-06-01']),
            $team,
            $member,
        );

        $this->assertFalse($payload['can_view_team']);
        $this->assertCount(1, $payload['day_entries']);
        $this->assertSame($member->id, $payload['day_entries'][0]['user_id']);
        $this->assertTrue($payload['day_entries'][0]['can_edit']);
        $this->assertSame(1.0, $payload['totals']['day_hours']);
        $this->assertSame($task->id, $payload['default_task_id']);
        $this->assertSame('2026-06-04', $payload['current_date']);
        $this->assertStringContainsString('date=2026-06-04', $payload['today_url']);
        $this->assertStringContainsString('week=2026-06-01', $payload['this_week_url']);

        CarbonImmutable::setTestNow();
    }

    private function seedTimedTask(): array
    {
        $team = Team::factory()->create(['time_tracking_enabled' => true]);
        $owner = User::factory()->for($team)->create(['name' => 'Owner User']);
        $member = User::factory()->for($team)->create(['name' => 'Member User']);
        $team->update(['owner_user_id' => $owner->id]);
        $project = Project::factory()->for($team)->create(['name' => 'Timed project']);
        $task = Task::factory()->for($project)->create(['name' => 'Tracked task']);

        return [$team, $owner, $member, $task];
    }
}
