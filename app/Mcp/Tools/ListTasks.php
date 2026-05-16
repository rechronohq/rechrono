<?php

namespace App\Mcp\Tools;

use App\Models\Task;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Description('List tasks, optionally filtered by project.')]
#[IsReadOnly]
class ListTasks extends Tool
{
    public function handle(Request $request): Response
    {
        $validated = $request->validate([
            'project_id' => ['nullable', 'uuid', 'exists:projects,id'],
        ]);

        $tasks = Task::query()
            ->with(['project', 'dependency', 'parent', 'assigneeUser'])
            ->when($validated['project_id'] ?? null, fn ($query, $projectId) => $query->where('project_id', $projectId))
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

    public function schema(JsonSchema $schema): array
    {
        return [
            'project_id' => $schema->string()->nullable()->format('uuid'),
        ];
    }
}
