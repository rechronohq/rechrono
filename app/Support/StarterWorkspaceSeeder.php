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
            ['team_id' => $team->id, 'name' => 'Demo Workspace'],
            ['description' => 'A simple starter project that shows common planning workflows.'],
        );

        if (! $project->tasks()->exists()) {
            $this->seedDemoWorkspace($project);
        }

        $secondProject = Project::firstOrCreate(
            ['team_id' => $team->id, 'name' => 'Example Project'],
            ['description' => 'A second sample project for trying timeline and template features.'],
        );

        if (! $secondProject->tasks()->exists()) {
            $this->seedExampleProject($secondProject);
        }
    }

    protected function seedDemoWorkspace(Project $project): void
    {
        $planning = Task::create([
            'project_id' => $project->id,
            'parent_id' => null,
            'sort_order' => 0,
            'name' => 'Plan',
            'description' => 'Collect the basics before work starts.',
            'start_date' => now()->startOfDay(),
            'end_date' => now()->addDays(4)->startOfDay(),
            'progress' => 0,
            'completed' => false,
        ]);

        $delivery = Task::create([
            'project_id' => $project->id,
            'parent_id' => null,
            'sort_order' => 1,
            'name' => 'Build',
            'description' => 'Move the plan through active work and review.',
            'start_date' => now()->addDays(5)->startOfDay(),
            'end_date' => now()->addDays(12)->startOfDay(),
            'progress' => 0,
            'completed' => false,
        ]);

        $kickoff = Task::create([
            'project_id' => $project->id,
            'parent_id' => $planning->id,
            'sort_order' => 0,
            'name' => 'Add a first task',
            'description' => 'Create a task with dates, progress, and completion status.',
            'start_date' => now()->startOfDay(),
            'end_date' => now()->addDay()->startOfDay(),
            'progress' => 100,
            'completed' => true,
        ]);

        Task::create([
            'project_id' => $project->id,
            'parent_id' => $planning->id,
            'sort_order' => 1,
            'name' => 'Review the schedule',
            'description' => 'Use the timeline to compare dates and make adjustments.',
            'start_date' => now()->addDays(2)->startOfDay(),
            'end_date' => now()->addDays(4)->startOfDay(),
            'progress' => 0,
            'completed' => false,
        ]);

        $build = Task::create([
            'project_id' => $project->id,
            'parent_id' => $delivery->id,
            'sort_order' => 0,
            'name' => 'Track progress',
            'description' => 'Update progress and connect this task to earlier work.',
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
            'name' => 'Add a nested task',
            'description' => 'Nest related work under a larger task.',
            'start_date' => now()->addDays(5)->startOfDay(),
            'end_date' => now()->addDays(7)->startOfDay(),
            'progress' => 0,
            'completed' => false,
        ]);

        Task::create([
            'project_id' => $project->id,
            'parent_id' => $delivery->id,
            'sort_order' => 1,
            'name' => 'Share the plan',
            'description' => 'Review the work, then duplicate, archive, or save it as a template.',
            'start_date' => now()->addDays(10)->startOfDay(),
            'end_date' => now()->addDays(12)->startOfDay(),
            'progress' => 0,
            'dependency_id' => $build->id,
            'completed' => false,
        ]);
    }

    protected function seedExampleProject(Project $project): void
    {
        $strategy = Task::create([
            'project_id' => $project->id,
            'parent_id' => null,
            'sort_order' => 0,
            'name' => 'Organize ideas',
            'description' => 'Group related work before turning it into tasks.',
            'start_date' => now()->addDays(1)->startOfDay(),
            'end_date' => now()->addDays(5)->startOfDay(),
            'progress' => 0,
            'completed' => false,
        ]);

        Task::create([
            'project_id' => $project->id,
            'parent_id' => $strategy->id,
            'sort_order' => 0,
            'name' => 'Try a template',
            'description' => 'Save a sample plan and create a fresh copy from it.',
            'start_date' => now()->addDays(1)->startOfDay(),
            'end_date' => now()->addDays(3)->startOfDay(),
            'progress' => 0,
            'completed' => false,
        ]);

        Task::create([
            'project_id' => $project->id,
            'parent_id' => null,
            'sort_order' => 1,
            'name' => 'Review timeline',
            'description' => 'Open a focused timeline view for this project.',
            'start_date' => now()->addDays(6)->startOfDay(),
            'end_date' => now()->addDays(10)->startOfDay(),
            'progress' => 0,
            'completed' => false,
        ]);
    }
}
