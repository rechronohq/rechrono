<?php

namespace App\Mcp\Resources;

use App\Models\Task;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\MimeType;
use Laravel\Mcp\Server\Attributes\Uri;
use Laravel\Mcp\Server\Resource;

#[Description('Read-only task snapshot for the planner.')]
#[MimeType('application/json')]
#[Uri('planner://tasks')]
class TasksResource extends Resource
{
    public function handle(Request $request): Response
    {
        $tasks = Task::query()
            ->with(['project', 'dependency', 'parent', 'assigneeUser'])
            ->orderBy('start_date')
            ->orderBy('name')
            ->get()
            ->map(fn (Task $task): array => [
                'id' => $task->id,
                'project_id' => $task->project_id,
                'project_name' => $task->project?->name,
                'parent_id' => $task->parent_id,
                'parent_name' => $task->parent?->name,
                'name' => $task->name,
                'description' => $task->description,
                'start_date' => $task->start_date?->toDateString(),
                'end_date' => $task->end_date?->toDateString(),
                'progress' => $task->progress,
                'completed' => $task->completed,
                'dependency_id' => $task->dependency_id,
                'dependency_name' => $task->dependency?->name,
                'assignee_user_id' => $task->assignee_user_id,
                'assignee_name' => $task->assigneeLabel(),
            ])
            ->all();

        return Response::json([
            'tasks' => $tasks,
        ]);
    }
}
