<?php

namespace App\Mcp\Tools;

use App\Models\Task;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Create a new task inside a project.')]
class CreateTask extends Tool
{
    public function handle(Request $request): Response
    {
        $validated = $request->validate([
            'project_id' => ['required', 'uuid', 'exists:projects,id'],
            'kind' => ['nullable', 'string', 'in:task,group'],
            'parent_id' => ['nullable', 'uuid', 'exists:tasks,id'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'progress' => ['nullable', 'integer', 'between:0,100'],
            'dependency_id' => ['nullable', 'uuid', 'exists:tasks,id'],
            'completed' => ['nullable', 'boolean'],
            'assignee_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $kind = $validated['kind'] ?? Task::KIND_TASK;

        if (($validated['parent_id'] ?? null) !== null) {
            Task::query()
                ->where('project_id', $validated['project_id'])
                ->findOrFail($validated['parent_id']);
        }

        if (($validated['dependency_id'] ?? null) !== null) {
            Task::query()
                ->where('project_id', $validated['project_id'])
                ->findOrFail($validated['dependency_id']);
        }

        $assigneeUserId = $this->assignment($validated);

        $task = Task::create([
            'project_id' => $validated['project_id'],
            'parent_id' => $validated['parent_id'] ?? null,
            'kind' => $kind,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'start_date' => $kind === Task::KIND_GROUP ? null : ($validated['start_date'] ?? null),
            'end_date' => $kind === Task::KIND_GROUP ? null : ($validated['end_date'] ?? null),
            'progress' => $kind === Task::KIND_GROUP ? 0 : ($validated['completed'] ?? false ? 100 : ($validated['progress'] ?? 0)),
            'dependency_id' => $kind === Task::KIND_GROUP ? null : ($validated['dependency_id'] ?? null),
            'assignee_user_id' => $kind === Task::KIND_GROUP ? null : $assigneeUserId,
            'completed' => $validated['completed'] ?? false,
            'sort_order' => Task::query()->where('project_id', $validated['project_id'])->where('parent_id', $validated['parent_id'] ?? null)->max('sort_order') + 1,
        ]);

        return Response::json([
            'task' => [
                'id' => $task->id,
                'project_id' => $task->project_id,
                'parent_id' => $task->parent_id,
                'kind' => $task->kind,
                'name' => $task->name,
                'assignee_user_id' => $task->assignee_user_id,
                'assignee_name' => $task->assigneeLabel(),
                'progress' => $task->progress,
                'completed' => $task->completed,
            ],
        ]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'project_id' => $schema->string()->format('uuid')->required(),
            'kind' => $schema->string()->nullable(),
            'parent_id' => $schema->string()->nullable()->format('uuid'),
            'name' => $schema->string()->required(),
            'description' => $schema->string()->nullable(),
            'start_date' => $schema->string()->nullable()->format('date'),
            'end_date' => $schema->string()->nullable()->format('date'),
            'progress' => $schema->integer()->nullable(),
            'dependency_id' => $schema->string()->nullable()->format('uuid'),
            'completed' => $schema->boolean()->nullable(),
            'assignee_user_id' => $schema->integer()->nullable(),
        ];
    }

    protected function assignment(array $validated): ?int
    {
        $assigneeUserId = $validated['assignee_user_id'] ?? null;

        return $assigneeUserId === null ? null : (int) $assigneeUserId;
    }
}
