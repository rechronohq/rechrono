<?php

namespace App\Mcp\Tools;

use App\Models\Task;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Update task dates, progress, completion, or dependency.')]
class UpdateTask extends Tool
{
    public function handle(Request $request): Response
    {
        $validated = $request->validate([
            'task_id' => ['required', 'uuid', 'exists:tasks,id'],
            'name' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'progress' => ['nullable', 'integer', 'between:0,100'],
            'dependency_id' => ['nullable', 'uuid', 'exists:tasks,id'],
            'completed' => ['nullable', 'boolean'],
            'assignee_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $task = Task::findOrFail($validated['task_id']);
        $assigneeUserId = $this->assignment($validated, $task);

        $task->fill([
            ...collect($validated)->except('task_id', 'assignee_user_id')->all(),
            'assignee_user_id' => $assigneeUserId,
        ]);

        if (array_key_exists('completed', $validated) && $validated['completed']) {
            $task->progress = 100;
        } elseif (array_key_exists('completed', $validated) && ! $validated['completed'] && $task->progress >= 100) {
            $task->progress = 99;
        }

        $task->save();

        return Response::json([
            'task' => [
                'id' => $task->id,
                'name' => $task->name,
                'start_date' => $task->start_date?->toDateString(),
                'end_date' => $task->end_date?->toDateString(),
                'progress' => $task->progress,
                'completed' => $task->completed,
                'parent_id' => $task->parent_id,
                'dependency_id' => $task->dependency_id,
                'assignee_user_id' => $task->assignee_user_id,
                'assignee_name' => $task->assigneeLabel(),
            ],
        ]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'task_id' => $schema->string()->format('uuid')->required(),
            'name' => $schema->string()->nullable(),
            'description' => $schema->string()->nullable(),
            'start_date' => $schema->string()->nullable()->format('date'),
            'end_date' => $schema->string()->nullable()->format('date'),
            'progress' => $schema->integer()->nullable(),
            'dependency_id' => $schema->string()->nullable()->format('uuid'),
            'completed' => $schema->boolean()->nullable(),
            'assignee_user_id' => $schema->integer()->nullable(),
        ];
    }

    protected function assignment(array $validated, Task $task): ?int
    {
        $assigneeUserId = array_key_exists('assignee_user_id', $validated) ? $validated['assignee_user_id'] : $task->assignee_user_id;

        return $assigneeUserId === null ? null : (int) $assigneeUserId;
    }
}
