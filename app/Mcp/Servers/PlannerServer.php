<?php

namespace App\Mcp\Servers;

use App\Mcp\Resources\ProjectsResource;
use App\Mcp\Resources\TasksResource;
use App\Mcp\Tools\CompleteTask;
use App\Mcp\Tools\CreateTask;
use App\Mcp\Tools\ListProjects;
use App\Mcp\Tools\ListTasks;
use App\Mcp\Tools\ReadProject;
use App\Mcp\Tools\ReorderTask;
use App\Mcp\Tools\UpdateTask;
use Laravel\Mcp\Server;
use Laravel\Mcp\Server\Attributes\Instructions;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Version;

#[Name('Planner Server')]
#[Version('0.0.1')]
#[Instructions('Use these tools to inspect projects, create or update tasks, and mark work complete in the Rechrono planner.')]
class PlannerServer extends Server
{
    protected array $tools = [
        ListProjects::class,
        ListTasks::class,
        ReadProject::class,
        CreateTask::class,
        ReorderTask::class,
        UpdateTask::class,
        CompleteTask::class,
    ];

    protected array $resources = [
        ProjectsResource::class,
        TasksResource::class,
    ];

    protected array $prompts = [
        //
    ];
}
