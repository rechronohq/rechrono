<?php

namespace App\Support;

use App\Models\Project;
use App\Models\Task;
use App\Models\Team;

class StarterWorkspaceSeeder
{
    public function seed(Team $team): void
    {
        $project = Project::firstOrCreate(
            ['team_id' => $team->id, 'name' => 'Default Planning Board'],
            ['description' => 'Starter project seeded for the internal Gantt planner.'],
        );

        if (! $project->tasks()->exists()) {
            $this->seedDefaultPlanningBoard($project);
        }

        $secondProject = Project::firstOrCreate(
            ['team_id' => $team->id, 'name' => 'Website Relaunch'],
            ['description' => 'Second seeded board for the unified planner timeline.'],
        );

        if (! $secondProject->tasks()->exists()) {
            $this->seedWebsiteRelaunch($secondProject);
        }
    }

    protected function seedDefaultPlanningBoard(Project $project): void
    {
        $planning = Task::create([
            'project_id' => $project->id,
            'parent_id' => null,
            'sort_order' => 0,
            'name' => 'Planning',
            'description' => 'Define scope and initial preparation.',
            'start_date' => now()->startOfDay(),
            'end_date' => now()->addDays(4)->startOfDay(),
            'progress' => 0,
            'completed' => false,
        ]);

        $delivery = Task::create([
            'project_id' => $project->id,
            'parent_id' => null,
            'sort_order' => 1,
            'name' => 'Delivery',
            'description' => 'Build and launch the work.',
            'start_date' => now()->addDays(5)->startOfDay(),
            'end_date' => now()->addDays(12)->startOfDay(),
            'progress' => 0,
            'completed' => false,
        ]);

        $kickoff = Task::create([
            'project_id' => $project->id,
            'parent_id' => $planning->id,
            'sort_order' => 0,
            'name' => 'Kickoff and scope',
            'description' => 'Confirm scope, owners, and the first delivery window.',
            'start_date' => now()->startOfDay(),
            'end_date' => now()->addDay()->startOfDay(),
            'progress' => 100,
            'completed' => true,
        ]);

        Task::create([
            'project_id' => $project->id,
            'parent_id' => $planning->id,
            'sort_order' => 1,
            'name' => 'Scenario review',
            'description' => 'Review requirements before execution begins.',
            'start_date' => now()->addDays(2)->startOfDay(),
            'end_date' => now()->addDays(4)->startOfDay(),
            'progress' => 0,
            'completed' => false,
        ]);

        $build = Task::create([
            'project_id' => $project->id,
            'parent_id' => $delivery->id,
            'sort_order' => 0,
            'name' => 'Build planner',
            'description' => 'Implement the scheduling workflow and task tracking.',
            'start_date' => now()->addDays(5)->startOfDay(),
            'end_date' => now()->addDays(9)->startOfDay(),
            'progress' => 55,
            'dependency_id' => $kickoff->id,
            'completed' => false,
        ]);

        Task::create([
            'project_id' => $project->id,
            'parent_id' => $build->id,
            'sort_order' => 0,
            'name' => 'Frontend timeline',
            'description' => 'Build the interactive timeline surface.',
            'start_date' => now()->addDays(5)->startOfDay(),
            'end_date' => now()->addDays(7)->startOfDay(),
            'progress' => 0,
            'completed' => false,
        ]);

        Task::create([
            'project_id' => $project->id,
            'parent_id' => $delivery->id,
            'sort_order' => 1,
            'name' => 'Review and launch',
            'description' => 'Review the plan with the team and confirm rollout readiness.',
            'start_date' => now()->addDays(10)->startOfDay(),
            'end_date' => now()->addDays(12)->startOfDay(),
            'progress' => 0,
            'dependency_id' => $build->id,
            'completed' => false,
        ]);
    }

    protected function seedWebsiteRelaunch(Project $project): void
    {
        $strategy = Task::create([
            'project_id' => $project->id,
            'parent_id' => null,
            'sort_order' => 0,
            'name' => 'Strategy',
            'description' => 'Define relaunch goals and positioning.',
            'start_date' => now()->addDays(1)->startOfDay(),
            'end_date' => now()->addDays(5)->startOfDay(),
            'progress' => 0,
            'completed' => false,
        ]);

        Task::create([
            'project_id' => $project->id,
            'parent_id' => $strategy->id,
            'sort_order' => 0,
            'name' => 'Messaging review',
            'description' => 'Refine homepage and launch copy.',
            'start_date' => now()->addDays(1)->startOfDay(),
            'end_date' => now()->addDays(3)->startOfDay(),
            'progress' => 0,
            'completed' => false,
        ]);

        Task::create([
            'project_id' => $project->id,
            'parent_id' => null,
            'sort_order' => 1,
            'name' => 'Launch prep',
            'description' => 'Prepare QA and release materials.',
            'start_date' => now()->addDays(6)->startOfDay(),
            'end_date' => now()->addDays(10)->startOfDay(),
            'progress' => 0,
            'completed' => false,
        ]);
    }
}
